import { type Address } from "viem";

// USDC — MockUSDC on Sepolia (public mint), real USDC on mainnet
export const USDC_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as Address | undefined) ??
  "0xb0364Dad6C6B487394eda896557ac82411902DA2";

export const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Contract addresses (set via .env.local) ───────────────────────────────────
export const VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

export const DECISION_LOG_ADDRESS =
  (process.env.NEXT_PUBLIC_DECISION_LOG_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

export const STORAGE_ANCHOR_ADDRESS =
  (process.env.NEXT_PUBLIC_STORAGE_ANCHOR_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

// ── Vault ABI (Arbitrum) ──────────────────────────────────────────────────────
export const VAULT_ABI = [
  // User actions
  { name: "deposit",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  // Agent actions (owner only)
  { name: "allocate", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount",   type: "uint256" }], outputs: [] },
  { name: "settle",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "returned", type: "uint256" }], outputs: [] },
  // Fee collection (owner only)
  { name: "collectManagementFee",  type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "collectPerformanceFee", type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  // Views
  { name: "poolBalance",        type: "function", stateMutability: "view", inputs: [],                               outputs: [{ name: "", type: "uint256" }] },
  { name: "deployedAmount",     type: "function", stateMutability: "view", inputs: [],                               outputs: [{ name: "", type: "uint256" }] },
  { name: "totalShares",        type: "function", stateMutability: "view", inputs: [],                               outputs: [{ name: "", type: "uint256" }] },
  { name: "sharesOf",           type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "userValue",          type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "pendingManagementFee", type: "function", stateMutability: "view", inputs: [],                             outputs: [{ name: "", type: "uint256" }] },
  { name: "highWaterMark",      type: "function", stateMutability: "view", inputs: [],                               outputs: [{ name: "", type: "uint256" }] },
  { name: "feeCollector",       type: "function", stateMutability: "view", inputs: [],                               outputs: [{ name: "", type: "address" }] },
  // Events
  { name: "Deposited",   type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "shares", type: "uint256", indexed: false }] },
  { name: "Withdrawn",   type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "shares", type: "uint256", indexed: false }] },
  { name: "Allocated",   type: "event", inputs: [{ name: "agent", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { name: "Settled",     type: "event", inputs: [{ name: "agent", type: "address", indexed: true }, { name: "returned", type: "uint256", indexed: false }, { name: "pnl", type: "uint256", indexed: false }, { name: "profit", type: "bool", indexed: false }] },
  { name: "FeeCharged",  type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "feeType", type: "string", indexed: false }] },
] as const;

// ── DecisionLog ABI (0G Chain — read-only for verify page) ───────────────────
export const DECISION_LOG_ABI = [
  {
    name: "getDecisionCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getDecision",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "decisionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "decisionHash", type: "bytes32" },
          { name: "storageRoot",  type: "bytes32" },
          { name: "timestamp",    type: "uint256" },
          { name: "agent",        type: "address" },
        ],
      },
    ],
  },
] as const;
