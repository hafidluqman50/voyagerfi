import { http } from "wagmi";
import { type Chain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const ogChain: Chain = {
  id: 16600,
  name: "0G Chain Mainnet",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://chainscan.0g.ai",
    },
  },
};

export const wagmiConfig = getDefaultConfig({
  appName: "VoyagerFi",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "",
  chains: [ogChain],
  transports: {
    [ogChain.id]: http("https://evmrpc.0g.ai"),
  },
});
