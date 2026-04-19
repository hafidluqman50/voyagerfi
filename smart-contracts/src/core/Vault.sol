// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVault} from "../interfaces/IVault.sol";
import {Errors} from "../libraries/Errors.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Vault is IVault {
    address public owner;
    address public perpetual;
    IERC20 public usdc;

    mapping(address => uint256) private balances;
    mapping(address => uint256) private lockedMargin;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Errors.Unauthorized();
        _;
    }

    modifier onlyPerpetual() {
        if (msg.sender != perpetual) revert Errors.Unauthorized();
        _;
    }

    constructor(address _usdc) {
        owner = msg.sender;
        usdc = IERC20(_usdc);
    }

    function setPerpetual(address _perpetual) external onlyOwner {
        if (_perpetual == address(0)) revert Errors.ZeroAddress();
        perpetual = _perpetual;
    }

    function deposit(uint256 amount) external {
        if (amount == 0) revert Errors.ZeroAmount();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert Errors.TransferFailed();
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert Errors.ZeroAmount();
        if (availableBalance(msg.sender) < amount) revert Errors.InsufficientBalance();
        balances[msg.sender] -= amount;
        if (!usdc.transfer(msg.sender, amount)) revert Errors.TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    function lockMargin(address user, uint256 amount) external onlyPerpetual {
        if (availableBalance(user) < amount) revert Errors.InsufficientBalance();
        lockedMargin[user] += amount;
        emit MarginLocked(user, amount);
    }

    function releaseMargin(address user, uint256 amount) external onlyPerpetual {
        lockedMargin[user] -= amount;
        emit MarginReleased(user, amount);
    }

    function settleProfit(address user, int256 pnl) external onlyPerpetual {
        if (pnl > 0) {
            balances[user] += uint256(pnl);
        } else if (pnl < 0) {
            uint256 loss = uint256(-pnl);
            balances[user] = balances[user] > loss ? balances[user] - loss : 0;
        }
    }

    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    function availableBalance(address user) public view returns (uint256) {
        return balances[user] - lockedMargin[user];
    }

    function getLockedMargin(address user) external view returns (uint256) {
        return lockedMargin[user];
    }
}
