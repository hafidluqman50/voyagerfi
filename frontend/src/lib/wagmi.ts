import { type Chain, mainnet } from "viem/chains";
import { createConfig, http } from "wagmi";

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

export const wagmiConfig = createConfig({
  chains: [ogChain],
  transports: {
    [ogChain.id]: http()
  },
});
