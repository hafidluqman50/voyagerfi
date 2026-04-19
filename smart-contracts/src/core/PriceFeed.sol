// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPriceFeed} from "../interfaces/IPriceFeed.sol";
import {Errors} from "../libraries/Errors.sol";

/// @notice Wrapper around Pyth Oracle for price feeds on 0G Chain
contract PriceFeed is IPriceFeed {
    address public pyth;
    bytes32 public priceId;
    uint256 public maxStaleness;

    uint256 private latestPrice;
    uint256 private latestTimestamp;

    address public owner;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Errors.Unauthorized();
        _;
    }

    constructor(address _pyth, bytes32 _priceId, uint256 _maxStaleness) {
        owner = msg.sender;
        pyth = _pyth;
        priceId = _priceId;
        maxStaleness = _maxStaleness;
    }

    function updatePrice(bytes[] calldata /* priceUpdateData */) external payable {
        // In production, call pyth.updatePriceFeeds{value: msg.value}(priceUpdateData)
        // Pyth integration will be added when deploying to 0G mainnet
    }

    /// @notice Set price manually (for testing / initial deployment)
    function setPrice(uint256 _price) external onlyOwner {
        latestPrice = _price;
        latestTimestamp = block.timestamp;
    }

    function getLatestPrice() external view returns (uint256 price, uint256 timestamp) {
        if (block.timestamp - latestTimestamp > maxStaleness) revert Errors.StalePrice();
        return (latestPrice, latestTimestamp);
    }
}
