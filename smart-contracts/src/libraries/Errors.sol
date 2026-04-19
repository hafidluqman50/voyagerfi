// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Errors {
    error ZeroAmount();
    error InsufficientBalance();
    error Unauthorized();
    error InvalidDirection();
    error InvalidLeverage();
    error PositionNotFound();
    error PositionAlreadyClosed();
    error NotLiquidatable();
    error StalePrice();
    error ZeroAddress();
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error MaxAgentsReached();
    error TransferFailed();
}
