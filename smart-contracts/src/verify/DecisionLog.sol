// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDecisionLog} from "../interfaces/IDecisionLog.sol";
import {IAgentRegistry} from "../interfaces/IAgentRegistry.sol";
import {Errors} from "../libraries/Errors.sol";

/// @notice Stores decision hashes on-chain for verifiable sealed inference
/// Each trade decision: signal input + LLM reasoning + decision = hash
contract DecisionLog is IDecisionLog {
    IAgentRegistry public agentRegistry;

    Decision[] public decisions;

    modifier onlyAgent() {
        if (!agentRegistry.isAgent(msg.sender)) revert Errors.Unauthorized();
        _;
    }

    constructor(address _agentRegistry) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    function logDecision(bytes32 decisionHash) external onlyAgent {
        uint256 decisionId = decisions.length;
        decisions.push(
            Decision({
                decisionHash: decisionHash,
                storageRoot: bytes32(0), // Set later via anchorStorage
                timestamp: block.timestamp,
                agent: msg.sender
            })
        );

        emit DecisionLogged(decisionId, decisionHash, msg.sender);
    }

    function anchorStorage(uint256 decisionId, bytes32 storageRoot) external onlyAgent {
        decisions[decisionId].storageRoot = storageRoot;
    }

    function getDecision(uint256 decisionId) external view returns (Decision memory) {
        return decisions[decisionId];
    }

    function getDecisionCount() external view returns (uint256) {
        return decisions.length;
    }
}
