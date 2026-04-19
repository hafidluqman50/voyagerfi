// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "../interfaces/IAgentRegistry.sol";
import {Errors} from "../libraries/Errors.sol";

/// @notice Anchors 0G Storage root hashes on-chain for verifiability
contract StorageAnchor {
    IAgentRegistry public agentRegistry;

    struct Anchor {
        bytes32 storageRoot;
        string metadata; // e.g. "trade_log_batch_42"
        uint256 timestamp;
        address agent;
    }

    Anchor[] public anchors;

    event Anchored(uint256 indexed anchorId, bytes32 storageRoot, address indexed agent);

    modifier onlyAgent() {
        if (!agentRegistry.isAgent(msg.sender)) revert Errors.Unauthorized();
        _;
    }

    constructor(address _agentRegistry) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    function anchor(bytes32 storageRoot, string calldata metadata) external onlyAgent {
        uint256 anchorId = anchors.length;
        anchors.push(
            Anchor({storageRoot: storageRoot, metadata: metadata, timestamp: block.timestamp, agent: msg.sender})
        );
        emit Anchored(anchorId, storageRoot, msg.sender);
    }

    function getAnchor(uint256 anchorId) external view returns (Anchor memory) {
        return anchors[anchorId];
    }

    function getAnchorCount() external view returns (uint256) {
        return anchors.length;
    }
}
