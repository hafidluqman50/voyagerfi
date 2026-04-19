// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/core/Vault.sol";
import {Errors} from "../src/libraries/Errors.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract VaultTest is Test {
    Vault public vault;
    MockUSDC public usdc;
    address public userA = makeAddr("userA");
    address public userB = makeAddr("userB");

    uint256 constant ONE  = 1_000_000;  // 1 USDC.e
    uint256 constant FIVE = 5_000_000;  // 5 USDC.e

    function setUp() public {
        usdc = new MockUSDC();
        vault = new Vault(address(usdc));
        usdc.mint(userA, 100_000_000);
        usdc.mint(userB, 100_000_000);
        vm.prank(userA);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(userB);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_Deposit() public {
        vm.prank(userA);
        vault.deposit(ONE);
        assertEq(vault.userValue(userA), ONE);
        assertEq(vault.poolBalance(), ONE);
    }

    function test_Withdraw() public {
        vm.prank(userA);
        vault.deposit(FIVE);

        vm.prank(userA);
        vault.withdraw(2_000_000);
        assertEq(vault.userValue(userA), 3_000_000);
        assertEq(vault.poolBalance(), 3_000_000);
    }

    function test_ProportionalShares() public {
        // UserA deposits 4, UserB deposits 1 → A has 80%, B has 20%
        vm.prank(userA);
        vault.deposit(4_000_000);
        vm.prank(userB);
        vault.deposit(1_000_000);

        assertEq(vault.poolBalance(), 5_000_000);
        assertEq(vault.userValue(userA), 4_000_000);
        assertEq(vault.userValue(userB), 1_000_000);
    }

    function test_ProfitDistribution() public {
        // UserA deposits 4, UserB deposits 1
        vm.prank(userA);
        vault.deposit(4_000_000);
        vm.prank(userB);
        vault.deposit(1_000_000);

        // Simulate +1 USDC.e profit from trading (called by perpetual)
        address perp = makeAddr("perp");
        vault.setPerpetual(perp);
        vm.prank(perp);
        vault.settlePoolProfit(int256(1_000_000));

        // Pool = 6, A gets 80% = 4.8, B gets 20% = 1.2
        assertEq(vault.poolBalance(), 6_000_000);
        assertEq(vault.userValue(userA), 4_800_000);
        assertEq(vault.userValue(userB), 1_200_000);
    }

    function test_RevertDepositZero() public {
        vm.prank(userA);
        vm.expectRevert(Errors.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_RevertWithdrawInsufficient() public {
        vm.prank(userA);
        vault.deposit(ONE);

        vm.prank(userA);
        vm.expectRevert(Errors.InsufficientBalance.selector);
        vault.withdraw(2_000_000);
    }
}
