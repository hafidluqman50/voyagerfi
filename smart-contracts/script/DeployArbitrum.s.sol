// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Vault} from "../src/core/Vault.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockWBTC} from "../src/mocks/MockWBTC.sol";
import {MockARB} from "../src/mocks/MockARB.sol";

// Deploy on Arbitrum Sepolia (testnet) or Arbitrum One (mainnet)
// Set DEPLOY_MOCKS=true for Sepolia — deploys MockUSDC (public mint), MockWBTC, MockARB
// On mainnet, set USDC_ADDRESS to real USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
contract DeployArbitrum is Script {
    function run() external {
        uint256 deployerKey  = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");
        address agentWallet  = vm.envAddress("AGENT_WALLET");
        bool    deployMocks  = vm.envOr("DEPLOY_MOCKS", false);

        vm.startBroadcast(deployerKey);

        address usdcAddress;
        if (deployMocks) {
            MockUSDC mockUsdc = new MockUSDC();
            usdcAddress = address(mockUsdc);
            console.log("MockUSDC:", usdcAddress);

            MockWBTC wbtc = new MockWBTC();
            MockARB  arb  = new MockARB();
            console.log("MockWBTC:", address(wbtc));
            console.log("MockARB: ", address(arb));
        } else {
            usdcAddress = vm.envAddress("USDC_ADDRESS");
        }

        Vault vault = new Vault(usdcAddress, feeCollector, agentWallet);
        console.log("Vault (Arbitrum):", address(vault));
        console.log("USDC:            ", usdcAddress);
        console.log("Fee collector:   ", feeCollector);
        console.log("Operator (agent):", agentWallet);

        vm.stopBroadcast();
    }
}
