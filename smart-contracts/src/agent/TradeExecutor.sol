// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPerpetual} from "../interfaces/IPerpetual.sol";
import {IDecisionLog} from "../interfaces/IDecisionLog.sol";
import {IAgentRegistry} from "../interfaces/IAgentRegistry.sol";
import {Errors} from "../libraries/Errors.sol";

/// @notice Batched trade execution by agent with decision logging
contract TradeExecutor {
    IPerpetual public perpetual;
    IDecisionLog public decisionLog;
    IAgentRegistry public agentRegistry;

    struct TradeOrder {
        address trader;
        IPerpetual.Direction direction;
        uint256 margin;
        uint256 leverage;
        bytes32 decisionHash;
    }

    event BatchExecuted(uint256 indexed batchId, uint256 tradeCount);

    uint256 public nextBatchId;

    modifier onlyAgent() {
        if (!agentRegistry.isAgent(msg.sender)) revert Errors.Unauthorized();
        _;
    }

    constructor(address _perpetual, address _decisionLog, address _agentRegistry) {
        perpetual = IPerpetual(_perpetual);
        decisionLog = IDecisionLog(_decisionLog);
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    function executeBatch(TradeOrder[] calldata orders) external onlyAgent {
        for (uint256 i = 0; i < orders.length; i++) {
            // Log decision hash first (sealed inference — commit before execute)
            decisionLog.logDecision(orders[i].decisionHash);

            // Execute trade
            perpetual.openPosition(
                orders[i].trader, orders[i].direction, orders[i].margin, orders[i].leverage
            );
        }

        emit BatchExecuted(nextBatchId++, orders.length);
    }

    function executeSingle(TradeOrder calldata order) external onlyAgent {
        decisionLog.logDecision(order.decisionHash);
        perpetual.openPosition(order.trader, order.direction, order.margin, order.leverage);
    }
}
