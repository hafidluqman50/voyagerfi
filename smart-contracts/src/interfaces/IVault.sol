// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event Allocated(address indexed agent, uint256 amount);
    event Settled(address indexed agent, uint256 returned, uint256 pnl, bool profit);
    event FeeCharged(address indexed user, uint256 amount, string feeType);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;

    // Agent trading lifecycle
    function allocate(uint256 amount) external;
    function settle(uint256 returned) external;

    // Fee collection (owner only)
    function collectManagementFee() external;
    function collectPerformanceFee(uint256 amount) external;

    // Views
    function sharesOf(address user) external view returns (uint256);
    function totalShares() external view returns (uint256);
    function poolBalance() external view returns (uint256);
    function deployedAmount() external view returns (uint256);
    function userValue(address user) external view returns (uint256);
    function pendingManagementFee() external view returns (uint256);
}
