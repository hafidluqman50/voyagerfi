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

// Minimal ERC-20 mock for testnet only
contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address agentWallet = vm.envAddress("AGENT_WALLET");
        bytes32 priceId = vm.envBytes32("PYTH_PRICE_ID");

        // TESTNET=true  → deploy MockUSDC, use dummy Pyth
        // TESTNET=false → use real USDC.e + real Pyth
        bool isTestnet = vm.envOr("TESTNET", false);

        address usdcAddress;
        address pythContract;

        vm.startBroadcast(deployerPrivateKey);

        if (isTestnet) {
            MockUSDC mockUsdc = new MockUSDC();
            // Mint 10,000 USDC to deployer for testing
            mockUsdc.mint(vm.addr(deployerPrivateKey), 10_000_000_000);
            usdcAddress = address(mockUsdc);
            pythContract = address(1); // dummy, agent uses setPrice() manually
            console.log("MockUSDC:", usdcAddress);
        } else {
            usdcAddress = vm.envAddress("USDC_ADDRESS");
            pythContract = vm.envAddress("PYTH_CONTRACT");
        }

        // 1. Agent Registry
        AgentRegistry agentRegistry = new AgentRegistry();
        agentRegistry.registerAgent(agentWallet);
        console.log("AgentRegistry:", address(agentRegistry));

        // 2. Vault (USDC.e collateral)
        Vault vault = new Vault(usdcAddress);
        console.log("Vault:", address(vault));

        // 3. Price Feed
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
