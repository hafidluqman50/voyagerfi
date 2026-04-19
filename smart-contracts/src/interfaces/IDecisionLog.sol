// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDecisionLog {
    struct Decision {
        bytes32 decisionHash;
        bytes32 storageRoot;
        uint256 timestamp;
        address agent;
    }

    event DecisionLogged(uint256 indexed decisionId, bytes32 decisionHash, address indexed agent);

    function logDecision(bytes32 decisionHash) external;
    function getDecision(uint256 decisionId) external view returns (Decision memory);
    function getDecisionCount() external view returns (uint256);
}
