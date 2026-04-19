// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVault} from "../interfaces/IVault.sol";
import {Errors} from "../libraries/Errors.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

// Pool vault: all user deposits go into a shared pool.
// The agent trades from the pool. Each user's profit/loss is
// proportional to their share of the pool.
//
// Share price = poolBalance / totalShares
// User value  = sharesOf(user) * poolBalance / totalShares
contract Vault is IVault {
    address public owner;
    address public perpetual;
    IERC20 public usdc;

    // Shares represent proportional ownership of the pool.
    // On first deposit 1 USDC.e = 1 share (1e6 precision).
    mapping(address => uint256) private _shares;
    uint256 private _totalShares;

    // Pool accounting
    uint256 private _poolBalance;  // tracked NAV (grows with profit, shrinks with loss)
    uint256 private _poolLocked;   // margin currently locked in open positions
    uint256 private _houseBuffer;  // deployer-provided USDC.e buffer to cover virtual PnL payouts

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

    // Deployer seeds house buffer — no shares minted, purely covers virtual PnL payouts
    function depositHouse(uint256 amount) external onlyOwner {
        if (amount == 0) revert Errors.ZeroAmount();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert Errors.TransferFailed();
        _houseBuffer += amount;
    }

    function withdrawHouse(uint256 amount) external onlyOwner {
        if (amount > _houseBuffer) revert Errors.InsufficientBalance();
        _houseBuffer -= amount;
        if (!usdc.transfer(msg.sender, amount)) revert Errors.TransferFailed();
    }

    function houseBuffer() external view returns (uint256) { return _houseBuffer; }

    function setPerpetual(address _perpetual) external onlyOwner {
        if (_perpetual == address(0)) revert Errors.ZeroAddress();
        perpetual = _perpetual;
    }

    // ── User deposit → mint shares proportional to current share price ──
    function deposit(uint256 amount) external {
        if (amount == 0) revert Errors.ZeroAmount();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert Errors.TransferFailed();

        uint256 newShares;
        if (_totalShares == 0 || _poolBalance == 0) {
            newShares = amount; // 1:1 on first deposit
        } else {
            newShares = (amount * _totalShares) / _poolBalance;
        }

        _shares[msg.sender] += newShares;
        _totalShares += newShares;
        _poolBalance += amount;

        emit Deposited(msg.sender, amount, newShares);
    }

    // ── User withdraw → burn shares, receive proportional USDC.e ──
    function withdraw(uint256 amount) external {
        if (amount == 0) revert Errors.ZeroAmount();
        uint256 uv = userValue(msg.sender);
        if (uv < amount) revert Errors.InsufficientBalance();
        if (poolAvailable() < amount) revert Errors.InsufficientBalance();

        uint256 burnShares = (amount * _totalShares) / _poolBalance;
        if (burnShares > _shares[msg.sender]) burnShares = _shares[msg.sender];

        _shares[msg.sender] -= burnShares;
        _totalShares -= burnShares;
        _poolBalance -= amount;

        if (!usdc.transfer(msg.sender, amount)) revert Errors.TransferFailed();
        emit Withdrawn(msg.sender, amount, burnShares);
    }

    // ── Called by Perpetual when opening a position ──
    function lockPoolMargin(uint256 amount) external onlyPerpetual {
        if (poolAvailable() < amount) revert Errors.InsufficientBalance();
        _poolLocked += amount;
        emit PoolMarginLocked(amount);
    }

    // ── Called by Perpetual when closing a position ──
    function releasePoolMargin(uint256 amount) external onlyPerpetual {
        if (amount > _poolLocked) amount = _poolLocked;
        _poolLocked -= amount;
        emit PoolMarginReleased(amount);
    }

    // ── PnL settlement: grows or shrinks the pool for all shareholders ──
    function settlePoolProfit(int256 pnl) external onlyPerpetual {
        if (pnl > 0) {
            _poolBalance += uint256(pnl);
        } else if (pnl < 0) {
            uint256 loss = uint256(-pnl);
            _poolBalance = _poolBalance > loss ? _poolBalance - loss : 0;
        }
        emit PoolProfitSettled(pnl);
    }

    // ── Views ──
    function sharesOf(address user) external view returns (uint256) {
        return _shares[user];
    }

    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    function poolBalance() external view returns (uint256) {
        return _poolBalance;
    }

    function poolAvailable() public view returns (uint256) {
        return _poolBalance > _poolLocked ? _poolBalance - _poolLocked : 0;
    }

    // User's current USDC.e value = share * pool NAV
    function userValue(address user) public view returns (uint256) {
        if (_totalShares == 0) return 0;
        return (_shares[user] * _poolBalance) / _totalShares;
    }
}
