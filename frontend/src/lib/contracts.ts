export const CONTRACTS = {
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "",
  perpetual: process.env.NEXT_PUBLIC_PERPETUAL_ADDRESS || "",
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || "",
  decisionLog: process.env.NEXT_PUBLIC_DECISION_LOG_ADDRESS || "",
  storageAnchor: process.env.NEXT_PUBLIC_STORAGE_ANCHOR_ADDRESS || "",
  tradeExecutor: process.env.NEXT_PUBLIC_TRADE_EXECUTOR_ADDRESS || "",
} as const;

// ABIs will be imported from contracts/out/ after compilation
// For now, minimal ABI for vault interactions
export const VAULT_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "availableBalance",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
