// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vault} from "../src/core/Vault.sol";
import {Errors} from "../src/libraries/Errors.sol";

contract VaultTest is Test {
    Vault public vault;
    address public user = makeAddr("user");

    function setUp() public {
        vault = new Vault();
        vm.deal(user, 100 ether);
    }

    function test_Deposit() public {
        vm.prank(user);
        vault.deposit{value: 1 ether}();
        assertEq(vault.balanceOf(user), 1 ether);
    }

    function test_Withdraw() public {
        vm.prank(user);
        vault.deposit{value: 5 ether}();

        vm.prank(user);
        vault.withdraw(2 ether);
        assertEq(vault.balanceOf(user), 3 ether);
    }

    function test_RevertDepositZero() public {
        vm.prank(user);
        vm.expectRevert(Errors.ZeroAmount.selector);
        vault.deposit{value: 0}();
    }

    function test_RevertWithdrawInsufficient() public {
        vm.prank(user);
        vault.deposit{value: 1 ether}();

        vm.prank(user);
        vm.expectRevert(Errors.InsufficientBalance.selector);
        vault.withdraw(2 ether);
    }
}
