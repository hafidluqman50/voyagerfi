# VoyagerFi

> **"AI-powered autonomous trading agent. Deposit, sleep, profit."**

VoyagerFi is an autonomous quant trading platform for Southeast Asia's retail crypto market. Users deposit USDC into a shared vault, select a risk profile, and the AI agent — powered by quant indicators and DeepSeek v3 reasoning via 0G Compute TEE — trades perpetuals on Hyperliquid automatically. Every decision is cryptographically anchored on 0G Chain, making the agent's behavior fully verifiable.

---

## How It Works

```
User deposits USDC (Arbitrum Vault)
        ↓
Agent: OBSERVE → THINK → ACT → LOG
  OBSERVE:  Pyth Oracle prices + news sentiment
  THINK:    RSI/MACD/Bollinger + DeepSeek v3 via 0G Compute (TEE)
  ACT:      Execute trades on Hyperliquid (real liquidity, real fills)
  LOG:      Decision hash → 0G Chain + full trace → 0G Storage
        ↓
User withdraws USDC + proportional profit
```

**No manual orders. Every decision is AI-generated and on-chain verifiable.**

---

## Architecture

### Two-Layer Design

| Layer | Purpose | Chain |
|---|---|---|
| **Vault** | User custody (deposit/withdraw USDC) | Arbitrum Sepolia |
| **Execution** | Trade perpetuals (real liquidity) | Hyperliquid Testnet |
| **Verifiability** | Decision hash + audit trail | 0G Chain Mainnet |
| **AI Inference** | DeepSeek v3 via TEE | 0G Compute |
| **Storage** | Full decision trace (verifiable) | 0G Storage |

### Why Hyperliquid for Execution?

Building a custom perpetuals engine requires building trust from scratch — liquidity, audit history, protocol risk. Hyperliquid is already battle-tested with billions in volume and a fully programmatic API. VoyagerFi's moat is the **AI agent + verifiability layer**, not the matching engine. We use the best available infrastructure for each layer.

### Why Arbitrum for the Vault?

0G Chain does not have native USDC. Hyperliquid settles in USDC from Arbitrum. Putting the vault on Arbitrum avoids cross-chain bridging complexity and lets users deposit/withdraw USDC natively with no bridge risk.

### 0G Integration (mandatory components)

- **0G Compute** — DeepSeek v3 (`deepseek-chat-v3-0324`) provides AI reasoning for every trade signal via TEE. This is the verifiable AI inference layer.
- **0G Storage** — Full decision trace (indicators, reasoning, signal strength, price, timestamp) uploaded and content-addressed for every decision.
- **0G Chain Mainnet** — `DecisionLog.sol` anchors decision hashes on-chain. `StorageAnchor.sol` links on-chain records to 0G Storage root hashes.

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 15 + React 19 + TailwindCSS + shadcn/ui |
| Wallet | RainbowKit + wagmi |
| Backend | Go 1.25 + Gin + GORM |
| Database | Supabase PostgreSQL (cache/index only) |
| Quant Engine | Custom RSI + MACD + Bollinger + MA |
| AI | DeepSeek v3 via 0G Compute (TEE) |
| Oracle | Pyth Network (Hermes REST) |
| Execution | Hyperliquid Testnet (perpetuals) |
| Vault | Arbitrum Sepolia (USDC) |
| Verifiability | 0G Chain Mainnet + 0G Storage |
| Smart Contracts | Solidity 0.8.24 + Foundry |

---

## Business Model

**0% management fee. 20% performance fee on net realized profit only.**

- Fee only activates when users profit — aligned incentives
- High-water mark rule: users must recover to previous peak before fee applies again
- Standard hedge fund practice, fully trustless via smart contract

**Why this works:**
- Retail SEA has crypto but lacks trading skill/time
- VoyagerFi = Robinhood of on-chain algo trading: AI-managed, TEE-verified, 0% management fee

**B2B2C Roadmap:**
- B2C: retail users deposit → bot trades → 20% on profit
- B2B2C: exchanges/wallets white-label VoyagerFi engine
- Institutional: custom risk params, $50k+ minimum

---

## Agent Loop

Every **10 seconds**, for each trading pair (ETH, BTC, SOL, ARB, BNB):

1. **OBSERVE**: Fetch live price from Pyth, macro/micro context, news sentiment
2. **THINK**: Run quant analysis (RSI, MACD, Bollinger, MA) + DeepSeek v3 reasoning
3. **COMBINE**: 40% quant signal + 60% AI signal = combined direction + strength
4. **ACT**: If no open position + signal strength > 0.3 → open Hyperliquid position
5. **MANAGE**: Close position if take profit (≥3%) or stop loss (≤-5%)
6. **LOG**: Hash decision → 0G Chain + upload trace → 0G Storage

### Risk Controls
- Signal threshold: 0.3 (weak signals rejected)
- Take profit: 3%
- Stop loss: 5%
- Leverage: 8–15x (balanced profile)
- Max drawdown: 20%

---

## Smart Contracts

### Arbitrum Sepolia (Vault)
| Contract | Purpose |
|---|---|
| `Vault.sol` | USDC custody, share-based NAV, deposit/withdraw |

### 0G Chain Mainnet (Verifiability)
| Contract | Purpose |
|---|---|
| `AgentRegistry.sol` | Whitelist of authorized agent wallets |
| `DecisionLog.sol` | On-chain decision hash anchor |
| `StorageAnchor.sol` | Links on-chain records to 0G Storage root hashes |

### Deployment

```bash
# Deploy Vault on Arbitrum Sepolia
forge script script/DeployArbitrum.s.sol --rpc-url $ARBITRUM_RPC_URL --broadcast

# Deploy verifiability contracts on 0G Chain Mainnet
forge script script/DeployOG.s.sol --rpc-url https://evmrpc.0g.ai --broadcast
```

---

## Local Development

### Backend
```bash
cd backend
cp .env.example .env
# Fill in AGENT_PRIVATE_KEY, DEEPSEEK_API_KEY, DEEPSEEK_URL, contract addresses
go run main.go
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Smart Contracts
```bash
cd smart-contracts
forge build
forge test
```

---

## Project Structure

```
voyagerfi/
├── backend/
│   ├── service/
│   │   ├── agent/          # Agent loop: OBSERVE → THINK → ACT → LOG
│   │   ├── quant/          # RSI, MACD, Bollinger, MA
│   │   ├── external/
│   │   │   ├── hyperliquid/ # Execution layer (trade placement + signing)
│   │   │   ├── deepseek/    # 0G Compute AI inference
│   │   │   ├── pyth/        # Price oracle
│   │   │   ├── storage/     # 0G Storage upload
│   │   │   └── news/        # News sentiment (RSS + CoinGecko)
│   │   └── chain/           # 0G Chain bindings (DecisionLog, StorageAnchor)
│   └── http/                # Gin REST API + WebSocket
├── frontend/                # Next.js dashboard
└── smart-contracts/         # Foundry (Vault + verifiability)
```

---

## Trading Pairs
ETH/USD · BTC/USD · SOL/USD · ARB/USD · BNB/USD

Risk profiles: **Balanced** (active) · Conservative (coming soon) · Aggressive (coming soon)

---

## Hackathon

**0G APAC Hackathon — Track 2: Agentic Trading Arena (Verifiable Finance)**
Deadline: May 9, 2026 23:59 UTC+8
