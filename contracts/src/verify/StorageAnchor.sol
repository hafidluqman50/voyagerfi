// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Anchors 0G Storage root hashes on-chain for verifiability
contract StorageAnchor {
    address public agentRegistry;

    struct Anchor {
        bytes32 storageRoot;
        string metadata; // e.g. "trade_log_batch_42"
        uint256 timestamp;
        address agent;
    }

    Anchor[] public anchors;

    event Anchored(uint256 indexed anchorId, bytes32 storageRoot, address indexed agent);

    modifier onlyAgent() {
        (bool success, bytes memory data) =
            agentRegistry.staticcall(abi.encodeWithSignature("isAgent(address)", msg.sender));
        require(success && abi.decode(data, (bool)), "Not authorized agent");
        _;
    }

    constructor(address _agentRegistry) {
        agentRegistry = _agentRegistry;
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
