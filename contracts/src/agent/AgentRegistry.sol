// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Errors} from "../libraries/Errors.sol";

contract AgentRegistry {
    uint256 public constant MAX_AGENTS = 10;

    address public owner;
    mapping(address => bool) public agents;
    address[] public agentList;

    event AgentRegistered(address indexed agent);
    event AgentRemoved(address indexed agent);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Errors.Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerAgent(address agent) external onlyOwner {
        if (agent == address(0)) revert Errors.ZeroAddress();
        if (agents[agent]) revert Errors.AgentAlreadyRegistered();
        if (agentList.length >= MAX_AGENTS) revert Errors.MaxAgentsReached();

        agents[agent] = true;
        agentList.push(agent);
        emit AgentRegistered(agent);
    }

    function removeAgent(address agent) external onlyOwner {
        if (!agents[agent]) revert Errors.AgentNotRegistered();

        agents[agent] = false;
        for (uint256 i = 0; i < agentList.length; i++) {
            if (agentList[i] == agent) {
                agentList[i] = agentList[agentList.length - 1];
                agentList.pop();
                break;
            }
        }
        emit AgentRemoved(agent);
    }

    function isAgent(address account) external view returns (bool) {
        return agents[account];
    }

    function getAgents() external view returns (address[] memory) {
        return agentList;
    }
}
