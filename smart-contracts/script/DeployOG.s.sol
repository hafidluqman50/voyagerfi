// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DecisionLog} from "../src/verify/DecisionLog.sol";
import {StorageAnchor} from "../src/verify/StorageAnchor.sol";

// Deploy verifiability contracts on 0G Chain
// Galileo Testnet — RPC: https://evmrpc-testnet.0g.ai  ChainID: 16602
// Mainnet        — RPC: https://evmrpc.0g.ai           ChainID: 16600
contract DeployOG is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentWallet = vm.envAddress("AGENT_WALLET");

        vm.startBroadcast(deployerKey);

        DecisionLog decisionLog = new DecisionLog(agentWallet);
        console.log("DecisionLog (0G):", address(decisionLog));

        StorageAnchor storageAnchor = new StorageAnchor(agentWallet);
        console.log("StorageAnchor (0G):", address(storageAnchor));

        vm.stopBroadcast();
    }
}
