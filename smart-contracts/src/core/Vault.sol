// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVault} from "../interfaces/IVault.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {Errors} from "../libraries/Errors.sol";

// Custody + trading vault on Arbitrum (USDC native).
//
// Fee structure (profit-first):
//   - 2%  management fee / year  — accrued continuously, pulled by owner anytime
//   - 20% performance fee        — pulled by owner per epoch on realized profit
//   - 0.1% withdrawal fee        — deducted automatically on every user withdraw
//
// Slippage capture: agent controls settle() amount. Any positive slippage
// from Uniswap V3 swaps stays in the agent wallet — not returned to vault.
//
// poolBalance() = usdc.balanceOf(this) + _deployedAmount
// Share price   = poolBalance() / totalShares
// User value    = sharesOf(user) * poolBalance() / totalShares
contract Vault is IVault {
    uint256 public constant MANAGEMENT_FEE_BPS  = 200;   // 2.00% per year
    uint256 public constant PERFORMANCE_FEE_BPS = 2000;  // 20.00% of profit
    uint256 public constant WITHDRAWAL_FEE_BPS  = 10;    // 0.10% on withdraw
    uint256 public constant BPS_BASE            = 10_000;
    uint256 public constant SECONDS_PER_YEAR    = 365 days;

    address public owner;
    address public operator;     // agent wallet — calls allocate/settle
    address public feeCollector; // treasury — receives all fees
    IERC20  public usdc;

    mapping(address => uint256) private _shares;
    uint256 private _totalShares;
    uint256 private _deployedAmount; // USDC currently held by agent for active trades

    uint256 public lastFeeCollection;
    uint256 public highWaterMark;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Errors.Unauthorized();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert Errors.Unauthorized();
        _;
    }

    constructor(address _usdc, address _feeCollector, address _operator) {
        owner             = msg.sender;
        feeCollector      = _feeCollector;
        operator          = _operator;
        usdc              = IERC20(_usdc);
        lastFeeCollection = block.timestamp;
    }

    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert Errors.ZeroAddress();
        operator = newOperator;
    }

    // ── User deposit → mint shares proportional to current pool ──────────────
    function deposit(uint256 amount) external {
        if (amount == 0) revert Errors.ZeroAmount();
        uint256 balance = poolBalance();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert Errors.TransferFailed();

        uint256 newShares;
        if (_totalShares == 0 || balance == 0) {
            newShares = amount;
        } else {
            newShares = (amount * _totalShares) / balance;
        }

        _shares[msg.sender] += newShares;
        _totalShares        += newShares;

        emit Deposited(msg.sender, amount, newShares);
    }

    // ── User withdraw → burn shares, 0.1% fee auto-deducted ──────────────────
    function withdraw(uint256 amount) external {
        if (amount == 0) revert Errors.ZeroAmount();
        if (userValue(msg.sender) < amount) revert Errors.InsufficientBalance();
        if (usdc.balanceOf(address(this)) < amount) revert Errors.InsufficientBalance();

        // 0.1% withdrawal fee — straight to feeCollector
        uint256 fee         = (amount * WITHDRAWAL_FEE_BPS) / BPS_BASE;
        uint256 userReceive = amount - fee;

        uint256 balance  = poolBalance();
        uint256 burnShares = (amount * _totalShares) / balance;
        if (burnShares > _shares[msg.sender]) burnShares = _shares[msg.sender];

        _shares[msg.sender] -= burnShares;
        _totalShares        -= burnShares;

        if (fee > 0) {
            if (!usdc.transfer(feeCollector, fee)) revert Errors.TransferFailed();
        }
        if (!usdc.transfer(msg.sender, userReceive)) revert Errors.TransferFailed();

        emit Withdrawn(msg.sender, userReceive, burnShares);
        emit FeeCharged(msg.sender, fee, "withdrawal");
    }

    // ── Agent: pull USDC from vault to trade on Uniswap V3 ───────────────────
    function allocate(uint256 amount) external onlyOperator {
        if (amount == 0) revert Errors.ZeroAmount();
        if (usdc.balanceOf(address(this)) < amount) revert Errors.InsufficientBalance();
        _deployedAmount += amount;
        if (!usdc.transfer(operator, amount)) revert Errors.TransferFailed();
        emit Allocated(operator, amount);
    }

    // ── Agent: return USDC after trading ─────────────────────────────────────
    // 'returned' can be more than deployed (profit) or less (loss).
    // Positive slippage difference stays in agent wallet — not included here.
    function settle(uint256 returned) external onlyOperator {
        uint256 deployed  = _deployedAmount;
        _deployedAmount   = 0;

        uint256 pnl;
        bool    profit;
        if (returned >= deployed) {
            pnl    = returned - deployed;
            profit = true;
        } else {
            pnl    = deployed - returned;
            profit = false;
        }

        if (returned > 0) {
            if (!usdc.transferFrom(operator, address(this), returned)) revert Errors.TransferFailed();
        }

        // Update HWM after USDC is actually in vault
        if (profit) {
            uint256 newBalance = usdc.balanceOf(address(this));
            if (newBalance > highWaterMark) highWaterMark = newBalance;
        }

        emit Settled(operator, returned, pnl, profit);
    }

    // ── Owner: pull accrued management fee (2% AUM / year) ───────────────────
    // Call anytime — calculates fee since last collection.
    function collectManagementFee() external onlyOwner {
        uint256 elapsed = block.timestamp - lastFeeCollection;
        if (elapsed == 0) return;

        uint256 aum = poolBalance();
        // fee = AUM * 2% * (elapsed / 1 year)
        uint256 fee = (aum * MANAGEMENT_FEE_BPS * elapsed) / (BPS_BASE * SECONDS_PER_YEAR);

        lastFeeCollection = block.timestamp;

        if (fee == 0) return;
        if (usdc.balanceOf(address(this)) < fee) {
            fee = usdc.balanceOf(address(this)); // take whatever is liquid
        }

        if (!usdc.transfer(feeCollector, fee)) revert Errors.TransferFailed();
        emit FeeCharged(address(0), fee, "management");
    }

    // ── Owner: pull performance fee from epoch profit ─────────────────────────
    // amount = 20% of epoch profit (calculated off-chain, pulled on-chain).
    // Only callable if pool is above high-water mark.
    function collectPerformanceFee(uint256 amount) external onlyOwner {
        if (amount == 0) revert Errors.ZeroAmount();
        if (poolBalance() <= highWaterMark) revert Errors.BelowHighWaterMark();
        if (usdc.balanceOf(address(this)) < amount) revert Errors.InsufficientBalance();
        if (!usdc.transfer(feeCollector, amount)) revert Errors.TransferFailed();
        emit FeeCharged(address(0), amount, "performance");
    }

    // ── Owner: update fee collector address ───────────────────────────────────
    function setFeeCollector(address newCollector) external onlyOwner {
        if (newCollector == address(0)) revert Errors.ZeroAddress();
        feeCollector = newCollector;
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function sharesOf(address user) external view returns (uint256) {
        return _shares[user];
    }

    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    function poolBalance() public view returns (uint256) {
        return usdc.balanceOf(address(this)) + _deployedAmount;
    }

    function deployedAmount() external view returns (uint256) {
        return _deployedAmount;
    }

    function userValue(address user) public view returns (uint256) {
        if (_totalShares == 0) return 0;
        return (_shares[user] * poolBalance()) / _totalShares;
    }

    // Accrued management fee not yet collected (for dashboard display)
    function pendingManagementFee() external view returns (uint256) {
        uint256 elapsed = block.timestamp - lastFeeCollection;
        uint256 aum     = poolBalance();
        return (aum * MANAGEMENT_FEE_BPS * elapsed) / (BPS_BASE * SECONDS_PER_YEAR);
    }
}
