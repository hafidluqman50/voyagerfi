// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDecisionLog} from "../interfaces/IDecisionLog.sol";
/// @notice Stores decision hashes on-chain for verifiable sealed inference
/// Each trade decision: signal input + LLM reasoning + decision = hash
contract DecisionLog is IDecisionLog {
    address public agentRegistry;

    Decision[] public decisions;

    modifier onlyAgent() {
        (bool success, bytes memory data) =
            agentRegistry.staticcall(abi.encodeWithSignature("isAgent(address)", msg.sender));
        require(success && abi.decode(data, (bool)), "Not authorized agent");
        _;
    }

    constructor(address _agentRegistry) {
        agentRegistry = _agentRegistry;
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
