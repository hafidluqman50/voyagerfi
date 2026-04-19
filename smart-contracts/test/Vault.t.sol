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
    address public user = makeAddr("user");

    uint256 constant ONE = 1_000_000;   // 1 USDC.e (6 decimals)
    uint256 constant FIVE = 5_000_000;  // 5 USDC.e

    function setUp() public {
        usdc = new MockUSDC();
        vault = new Vault(address(usdc));
        usdc.mint(user, 100_000_000); // 100 USDC.e
        vm.prank(user);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_Deposit() public {
        vm.prank(user);
        vault.deposit(ONE);
        assertEq(vault.balanceOf(user), ONE);
    }

    function test_Withdraw() public {
        vm.prank(user);
        vault.deposit(FIVE);

        vm.prank(user);
        vault.withdraw(2_000_000);
        assertEq(vault.balanceOf(user), 3_000_000);
    }

    function test_RevertDepositZero() public {
        vm.prank(user);
        vm.expectRevert(Errors.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_RevertWithdrawInsufficient() public {
        vm.prank(user);
        vault.deposit(ONE);

        vm.prank(user);
        vm.expectRevert(Errors.InsufficientBalance.selector);
        vault.withdraw(2_000_000);
    }
}
