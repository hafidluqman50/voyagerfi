// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event PoolMarginLocked(uint256 amount);
    event PoolMarginReleased(uint256 amount);
    event PoolProfitSettled(int256 pnl);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;

    // Pool-level functions called by Perpetual
    function lockPoolMargin(uint256 amount) external;
    function releasePoolMargin(uint256 amount) external;
    function settlePoolProfit(int256 pnl) external;

    // Views
    function sharesOf(address user) external view returns (uint256);
    function totalShares() external view returns (uint256);
    function poolBalance() external view returns (uint256);
    function poolAvailable() external view returns (uint256);
    function userValue(address user) external view returns (uint256);
}
