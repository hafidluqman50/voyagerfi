import { type Address } from "viem";

// ── Contract addresses (set via .env.local) ───────────────────────────────────
export const VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_VAULT_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

export const PERPETUAL_ADDRESS =
  (process.env.NEXT_PUBLIC_PERPETUAL_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

export const DECISION_LOG_ADDRESS =
  (process.env.NEXT_PUBLIC_DECISION_LOG_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

export const STORAGE_ANCHOR_ADDRESS =
  (process.env.NEXT_PUBLIC_STORAGE_ANCHOR_ADDRESS as Address | undefined) ??
  "0x0000000000000000000000000000000000000000";

// ── Vault ABI ─────────────────────────────────────────────────────────────────
export const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "availableBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getLockedMargin",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "Deposited",
    type: "event",
    inputs: [
      { name: "user",   type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Withdrawn",
    type: "event",
    inputs: [
      { name: "user",   type: "address", indexed: true  },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ── Perpetual ABI (read-only from frontend) ───────────────────────────────────
export const PERPETUAL_ABI = [
  {
    name: "getPosition",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",         type: "uint256" },
          { name: "trader",     type: "address" },
          { name: "direction",  type: "uint8"   },
          { name: "size",       type: "uint256" },
          { name: "leverage",   type: "uint256" },
          { name: "entryPrice", type: "uint256" },
          { name: "margin",     type: "uint256" },
          { name: "isOpen",     type: "bool"    },
          { name: "openedAt",   type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getTraderPositions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "trader", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
] as const;

// ── DecisionLog ABI ───────────────────────────────────────────────────────────
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
