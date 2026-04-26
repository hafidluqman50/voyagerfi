// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDecisionLog} from "../interfaces/IDecisionLog.sol";
import {Errors} from "../libraries/Errors.sol";

contract DecisionLog is IDecisionLog {
    address public owner;
    address public agent;
    Decision[] public decisions;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Errors.Unauthorized();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert Errors.Unauthorized();
        _;
    }

    constructor(address _agent) {
        owner = msg.sender;
        agent = _agent;
    }

    function setAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert Errors.ZeroAddress();
        agent = newAgent;
    }

    function logDecision(bytes32 decisionHash) external onlyAgent {
        uint256 decisionId = decisions.length;
        decisions.push(
            Decision({
                decisionHash: decisionHash,
                storageRoot:  bytes32(0),
                timestamp:    block.timestamp,
                agent:        msg.sender
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
