// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Vault} from "../src/core/Vault.sol";
import {PriceFeed} from "../src/core/PriceFeed.sol";
import {Perpetual} from "../src/core/Perpetual.sol";
import {AgentRegistry} from "../src/agent/AgentRegistry.sol";
import {DecisionLog} from "../src/verify/DecisionLog.sol";
import {StorageAnchor} from "../src/verify/StorageAnchor.sol";
import {TradeExecutor} from "../src/agent/TradeExecutor.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentWallet = vm.envAddress("AGENT_WALLET");
        address pythContract = vm.envAddress("PYTH_CONTRACT");
        bytes32 priceId = vm.envBytes32("PYTH_PRICE_ID");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Agent Registry
        AgentRegistry agentRegistry = new AgentRegistry();
        agentRegistry.registerAgent(agentWallet);
        console.log("AgentRegistry:", address(agentRegistry));

        // 2. Vault
        Vault vault = new Vault();
        console.log("Vault:", address(vault));

        // 3. Price Feed (Pyth wrapper)
        PriceFeed priceFeed = new PriceFeed(pythContract, priceId, 60);
        console.log("PriceFeed:", address(priceFeed));

        // 4. Perpetual
        Perpetual perpetual = new Perpetual(address(vault), address(priceFeed), address(agentRegistry));
        console.log("Perpetual:", address(perpetual));

        // 5. Link Vault → Perpetual
        vault.setPerpetual(address(perpetual));

        // 6. Decision Log
        DecisionLog decisionLog = new DecisionLog(address(agentRegistry));
        console.log("DecisionLog:", address(decisionLog));

        // 7. Storage Anchor
        StorageAnchor storageAnchor = new StorageAnchor(address(agentRegistry));
        console.log("StorageAnchor:", address(storageAnchor));

        // 8. Trade Executor
        TradeExecutor tradeExecutor =
            new TradeExecutor(address(perpetual), address(decisionLog), address(agentRegistry));
        console.log("TradeExecutor:", address(tradeExecutor));

        vm.stopBroadcast();
    }
}
