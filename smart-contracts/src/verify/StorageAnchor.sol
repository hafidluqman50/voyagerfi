// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Errors} from "../libraries/Errors.sol";

contract StorageAnchor {
    address public owner;
    address public agent;

    struct Anchor {
        bytes32 storageRoot;
        string  metadata;
        uint256 timestamp;
        address agent;
    }

    Anchor[] public anchors;

    event Anchored(uint256 indexed anchorId, bytes32 storageRoot, address indexed agent);

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
