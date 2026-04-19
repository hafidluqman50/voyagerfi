// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event MarginLocked(address indexed user, uint256 amount);
    event MarginReleased(address indexed user, uint256 amount);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
    function availableBalance(address user) external view returns (uint256);
    function lockMargin(address user, uint256 amount) external;
    function releaseMargin(address user, uint256 amount) external;
    function settleProfit(address user, int256 pnl) external;
}
