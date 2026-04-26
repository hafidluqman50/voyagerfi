// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/core/Vault.sol";
import {Errors} from "../src/libraries/Errors.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

contract VaultTest is Test {
    Vault      public vault;
    MockUSDC   public usdc;
    address    public feeCollector = makeAddr("feeCollector");
    address    public agentWallet  = makeAddr("agentWallet");
    address    public userA        = makeAddr("userA");
    address    public userB        = makeAddr("userB");

    uint256 constant ONE  = 1_000_000;  // 1 USDC (6 decimals)
    uint256 constant FIVE = 5_000_000;  // 5 USDC

    function setUp() public {
        usdc  = new MockUSDC();
        vault = new Vault(address(usdc), feeCollector, agentWallet);
        usdc.mint(userA, 10_000_000_000); // 10,000 USDC
        usdc.mint(userB, 10_000_000_000);
        vm.prank(userA);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(userB);
        usdc.approve(address(vault), type(uint256).max);
        // give owner wallet some USDC to settle back
        usdc.mint(address(this), 10_000_000_000);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_Deposit() public {
        vm.prank(userA);
        vault.deposit(ONE);
        assertEq(vault.userValue(userA), ONE);
        assertEq(vault.poolBalance(), ONE);
    }

    function test_WithdrawDeductsExitFee() public {
        vm.prank(userA);
        vault.deposit(FIVE);

        uint256 withdrawAmount = 2_000_000;
        uint256 expectedFee    = (withdrawAmount * vault.WITHDRAWAL_FEE_BPS()) / vault.BPS_BASE();
        uint256 expectedReceive = withdrawAmount - expectedFee;

        uint256 balanceBefore = usdc.balanceOf(userA);
        vm.prank(userA);
        vault.withdraw(withdrawAmount);

        assertEq(usdc.balanceOf(userA) - balanceBefore, expectedReceive);
        assertEq(usdc.balanceOf(feeCollector), expectedFee);
    }

    function test_ProportionalShares() public {
        vm.prank(userA);
        vault.deposit(4_000_000);
        vm.prank(userB);
        vault.deposit(1_000_000);

        assertEq(vault.poolBalance(), 5_000_000);
        assertEq(vault.userValue(userA), 4_000_000);
        assertEq(vault.userValue(userB), 1_000_000);
    }

    function test_AllocateAndSettle_Profit() public {
        vm.prank(userA);
        vault.deposit(10_000_000);

        uint256 allocateAmount = 5_000_000;
        vault.allocate(allocateAmount);

        assertEq(vault.deployedAmount(), allocateAmount);
        assertEq(vault.poolBalance(), 10_000_000); // poolBalance = liquid + deployed

        // settle with profit: returned 6 USDC for 5 deployed
        uint256 returned = 6_000_000;
        vault.settle(returned);

        assertEq(vault.deployedAmount(), 0);
        assertEq(vault.poolBalance(), 5_000_000 + returned); // liquid 5 + returned 6
    }

    function test_AllocateAndSettle_Loss() public {
        vm.prank(userA);
        vault.deposit(10_000_000);

        vault.allocate(5_000_000);

        // settle with loss: returned 4 USDC for 5 deployed
        uint256 returned = 4_000_000;
        vault.settle(returned);

        assertEq(vault.poolBalance(), 5_000_000 + returned);
    }

    function test_ManagementFeeAccrues() public {
        vm.prank(userA);
        vault.deposit(ONE * 1000); // 1000 USDC

        vm.warp(block.timestamp + 365 days);

        uint256 pending = vault.pendingManagementFee();
        // ~2% of 1000 USDC = ~20 USDC (slight variance due to integer division)
        assertApproxEqRel(pending, 20_000_000, 1e15); // within 0.1%
    }

    function test_CollectManagementFee() public {
        vm.prank(userA);
        vault.deposit(ONE * 1000);

        vm.warp(block.timestamp + 365 days);

        vault.collectManagementFee();
        assertGt(usdc.balanceOf(feeCollector), 0);
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

    function test_RevertAllocateNotOwner() public {
        vm.prank(userA);
        vault.deposit(ONE);

        vm.prank(userA);
        vm.expectRevert(Errors.Unauthorized.selector);
        vault.allocate(ONE);
    }
}
