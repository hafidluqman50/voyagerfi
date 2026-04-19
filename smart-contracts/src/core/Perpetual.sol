// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPerpetual} from "../interfaces/IPerpetual.sol";
import {IPriceFeed} from "../interfaces/IPriceFeed.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IAgentRegistry} from "../interfaces/IAgentRegistry.sol";
import {Errors} from "../libraries/Errors.sol";
import {MathLib} from "../libraries/MathLib.sol";

contract Perpetual is IPerpetual {
    using MathLib for uint256;

    uint256 public constant MAX_LEVERAGE = 50;
    uint256 public constant LIQUIDATION_THRESHOLD = 80;
    uint256 public constant FEE_BPS = 10; // 0.1%

    IVault public vault;
    IPriceFeed public priceFeed;
    IAgentRegistry public agentRegistry;

    uint256 public nextPositionId;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public traderPositions;

    modifier onlyAgent() {
        if (!agentRegistry.isAgent(msg.sender)) revert Errors.Unauthorized();
        _;
    }

    modifier onlyAgentOrTrader(uint256 positionId) {
        if (msg.sender != positions[positionId].trader && !agentRegistry.isAgent(msg.sender))
            revert Errors.Unauthorized();
        _;
    }

    constructor(address _vault, address _priceFeed, address _agentRegistry) {
        vault = IVault(_vault);
        priceFeed = IPriceFeed(_priceFeed);
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    // Agent opens a position. Margin is locked from the shared pool.
    // `trader` is recorded for attribution but pool funds are used.
    function openPosition(address trader, Direction direction, uint256 margin, uint256 leverage)
        external
        onlyAgent
    {
        if (leverage == 0 || leverage > MAX_LEVERAGE) revert Errors.InvalidLeverage();
        if (margin == 0) revert Errors.ZeroAmount();

        (uint256 price,) = priceFeed.getLatestPrice();
        uint256 size = MathLib.mulDiv(margin, leverage, 1);
        uint256 fee = MathLib.mulDiv(size, FEE_BPS, 10_000);

        vault.lockPoolMargin(margin + fee);

        uint256 positionId = nextPositionId++;
        positions[positionId] = Position({
            id: positionId,
            trader: trader,
            direction: direction,
            size: size,
            leverage: leverage,
            entryPrice: price,
            margin: margin,
            fee: fee,
            isOpen: true,
            openedAt: block.timestamp
        });
        traderPositions[trader].push(positionId);

        emit PositionOpened(positionId, trader, direction, size, leverage, price);
    }

    function closePosition(uint256 positionId) external onlyAgentOrTrader(positionId) {
        Position storage pos = positions[positionId];
        if (!pos.isOpen) revert Errors.PositionAlreadyClosed();

        (uint256 currentPrice,) = priceFeed.getLatestPrice();
        int256 pnl = _calculatePnL(pos, currentPrice);

        pos.isOpen = false;
        vault.releasePoolMargin(pos.margin + pos.fee);
        vault.settlePoolProfit(pnl);

        emit PositionClosed(positionId, currentPrice, pnl);
    }

    function liquidate(uint256 positionId) external {
        Position storage pos = positions[positionId];
        if (!pos.isOpen) revert Errors.PositionAlreadyClosed();

        (uint256 currentPrice,) = priceFeed.getLatestPrice();
        int256 pnl = _calculatePnL(pos, currentPrice);

        uint256 maxLoss = MathLib.mulDiv(pos.margin, LIQUIDATION_THRESHOLD, 100);
        if (pnl >= 0 || MathLib.abs(pnl) < maxLoss) revert Errors.NotLiquidatable();

        pos.isOpen = false;
        vault.releasePoolMargin(pos.margin + pos.fee);
        vault.settlePoolProfit(pnl);

        emit PositionLiquidated(positionId, currentPrice);
    }

    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }

    function getTraderPositions(address trader) external view returns (uint256[] memory) {
        return traderPositions[trader];
    }

    function _calculatePnL(Position memory pos, uint256 currentPrice) internal pure returns (int256) {
        int256 priceDelta = int256(currentPrice) - int256(pos.entryPrice);
        if (pos.direction == Direction.Short) priceDelta = -priceDelta;
        return (priceDelta * int256(pos.size)) / int256(pos.entryPrice);
    }
}
