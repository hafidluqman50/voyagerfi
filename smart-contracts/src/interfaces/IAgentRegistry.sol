// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    function isAgent(address account) external view returns (bool);
}
