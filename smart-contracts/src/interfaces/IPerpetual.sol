// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPerpetual {
    enum Direction {
        Long,
        Short
    }

    struct Position {
        uint256 id;
        address trader;
        Direction direction;
        uint256 size;
        uint256 leverage;
        uint256 entryPrice;
        uint256 margin;
        uint256 fee;
        bool isOpen;
        uint256 openedAt;
    }

    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        Direction direction,
        uint256 size,
        uint256 leverage,
        uint256 entryPrice
    );
    event PositionClosed(uint256 indexed positionId, uint256 exitPrice, int256 pnl);
    event PositionLiquidated(uint256 indexed positionId, uint256 exitPrice);

    function openPosition(address trader, Direction direction, uint256 margin, uint256 leverage) external;
    function closePosition(uint256 positionId) external;
    function liquidate(uint256 positionId) external;
    function getPosition(uint256 positionId) external view returns (Position memory);
}
