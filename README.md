# VoyagerFi

> **"Autonomous quant + sentiment trading agent. Deposit, sleep, profit."**

VoyagerFi is an autonomous trading agent platform running fully on-chain on **0G Chain**. Users deposit USDC.e, select a risk profile, and the agent — powered by quantitative indicators and real-time news sentiment analysis — executes perpetual trades automatically. No manual orders, no emotion, and every decision is cryptographically recorded on the blockchain.

---

## Background

Southeast Asia is one of the largest crypto markets in the world, yet the majority of retail traders still lose money due to manual, emotion-driven trading: FOMO on the way up, panic-selling on the way down. They want capital gains but lack the time, skill, or infrastructure to compete against bots and institutions.

VoyagerFi's answer: **an AI agent that trades on behalf of users**, with every decision verifiable on-chain. Not a black box — every signal, reasoning step, and execution is recorded on 0G Chain and 0G Storage.

---

## How It Works

### User Flow
1. Open VoyagerFi → view the dashboard: live prices, agent activity, market news
2. Go to **Trade** → select a risk profile (Conservative / Balanced / Aggressive)
3. **Deposit USDC.e** into the vault → pool shares are issued proportionally
4. The agent trades automatically → profit/loss is distributed proportionally to all depositors
5. **Withdraw** at any time based on the current share value

### Agent Decision Loop (every 10 seconds per pair)
```
OBSERVE → THINK → ACT → LOG
```

1. **OBSERVE** — Fetch live prices from Pyth Oracle + pull market news from CoinTelegraph & CoinDesk RSS feeds
2. **THINK**
   - Quant analysis: RSI, MACD, Bollinger Bands, Moving Average → signal + strength score
   - AI reasoning via DeepSeek on 0G Compute (TEE-verified) → macro & micro market context
   - News sentiment: bullish/bearish keyword scoring → ±30% modifier applied to signal strength
   - Signal combine: 40% quant + 60% AI
3. **ACT** — If signal strength exceeds 0.3 threshold and no open position exists for that pair → call `OpenPosition` on-chain via Perpetual.sol
4. **LOG** — Hash decision (keccak256) → persist to DB + anchor on-chain via DecisionLog.sol + upload to 0G Storage

### Pool Vault Model
- All deposits flow into a **shared pool** — not isolated per-user accounts
- Share price = `poolBalance / totalShares`
- User value = `shares[user] × poolBalance / totalShares`
- Agent profit → `poolBalance` increases → all shareholders gain proportionally
- Agent loss → `poolBalance` decreases → all shareholders bear loss proportionally (fair and transparent)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  Dashboard · Trade · Positions · Verify (Decision Logs)  │
│  RainbowKit + wagmi · Pyth prices fetched from browser   │
└────────────────────┬────────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼────────────────────────────────────┐
│                   Backend (Go / Gin)                     │
│                                                          │
│  Agent Loop ──► Quant Engine (RSI/MACD/BB/MA)           │
│       │    └──► DeepSeek Client (0G Compute / TEE)      │
│       │    └──► News Fetcher (RSS sentiment scoring)     │
│       │    └──► Risk Manager (position sizing)           │
│       │                                                  │
│  Chain Bindings ──► Vault · Perpetual · PriceFeed        │
│                └──► DecisionLog · StorageAnchor          │
│                                                          │
│  PostgreSQL (Supabase) ← cache/index layer only          │
└────────────────────┬────────────────────────────────────┘
                     │ RPC calls
┌────────────────────▼────────────────────────────────────┐
│                  0G Chain (Mainnet)                      │
│                                                          │
│  Vault.sol          → deposit / withdraw USDC.e          │
│  Perpetual.sol      → open / close positions             │
│  PriceFeed.sol      → Pyth price oracle                  │
│  DecisionLog.sol    → keccak256 decision hash commit     │
│  StorageAnchor.sol  → 0G Storage proof anchor            │
│  AgentRegistry.sol  → agent wallet whitelist             │
│  TradeExecutor.sol  → batch execute + log decision       │
└─────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   0G Storage                             │
│  Trade logs · signals · news cache · agent state         │
│  (verifiable, content-addressed)                         │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, RainbowKit, wagmi, TanStack Query |
| Backend | Go 1.24, Gin, GORM, WebSocket |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Database | Supabase PostgreSQL (cache layer) |
| Oracle | Pyth Network (Hermes REST — ETH/USD, BTC/USD, SOL/USD, ARB/USD, BNB/USD) |
| AI | DeepSeek v3 via 0G Compute (TEE-verified inference) |
| Storage | 0G Storage (verifiable data layer) |
| Chain | 0G Chain Mainnet |

---

## 0G Integration

VoyagerFi uses three core components from the 0G ecosystem:

### 1. 0G Chain
All smart contracts are deployed on 0G Chain. Every trade, deposit, withdrawal, and decision hash is permanently recorded on-chain. No centralized server can fabricate or alter trading performance.

### 2. 0G Compute — DeepSeek TEE
Agent reasoning runs via the 0G Compute marketplace using DeepSeek v3 inside a Trusted Execution Environment (TEE). This means AI inference is verifiably unmanipulated — even by VoyagerFi operators themselves.

### 3. 0G Storage
Every decision record — quant signals, AI reasoning, executed action, news context — is uploaded to 0G Storage as a verifiable blob. `StorageAnchor.sol` stores the root hash on-chain, allowing anyone to verify that no data has been tampered with.

---

## Business Model

**0% management fee. 20% performance fee on net realized profit only.**

- Fee is only collected when users profit — no fee on losses
- **High-water mark rule**: users must recover to their previous equity peak before the performance fee reactivates — a standard hedge fund practice that strongly aligns incentives
- VoyagerFi only earns when users earn

### Revenue Streams

| Segment | Model |
|---|---|
| B2C (Retail) | 20% performance fee on net profit per epoch |
| B2B2C (White-label) | Revenue split: partner 5%, VoyagerFi 15% |
| B2B (Institutional) | AUM-based, $50k+ minimum, custom risk params via API |

### Competitive Moat
- TEE-verified AI inference — competitors cannot fake verifiable performance
- Fully on-chain fee collection — fully auditable and trustless
- AUM network effect → more capital → richer data → smarter agent decisions

---

## Trading Pairs & Risk Profiles

| Pair | Status |
|---|---|
| ETH/USD | Active |
| BTC/USD | Active |
| SOL/USD | Active |
| ARB/USD | Active |
| BNB/USD | Active |

**Risk Profiles:**
- **Conservative** — Coming Soon
- **Balanced** — Active (leverage 8–15x, automatically adjusted by the risk manager)
- **Aggressive** — Coming Soon

---

## Roadmap

| Quarter | Milestone |
|---|---|
| Q2 2025 — Hackathon | MVP: single vault, ETH/BTC, basic agent, verifiable on 0G |
| Q3 2025 | Multi-pair agent, performance fee smart contract, security audit |
| Q4 2025 | B2C public launch, referral program, mobile PWA |
| Q1 2026 | B2B API (white-label), per-pair exclusion/focus config |
| Q2 2026 | B2B2C partnerships, institutional tier |

---

## Smart Contracts

Deployed on **0G Chain Mainnet**:

| Contract | Address |
|---|---|
| Vault | TBD |
| Perpetual | TBD |
| PriceFeed | TBD |
| DecisionLog | TBD |
| StorageAnchor | TBD |
| AgentRegistry | TBD |
| TradeExecutor | TBD |

---

## Project Structure

```
voyagerfi/
├── frontend/             # Next.js app — dashboard, trade, positions, verify
├── backend/              # Go agent loop + REST API + WebSocket
│   ├── service/agent/    # Agent loop, risk manager, decision hashing
│   ├── service/quant/    # RSI, MACD, Bollinger Bands, MA engine
│   ├── service/chain/    # On-chain bindings (Vault, Perpetual, etc.)
│   ├── service/external/ # DeepSeek, Pyth, 0G Storage, news RSS
│   └── http/             # Gin HTTP handlers + WebSocket hub
└── smart-contracts/      # Foundry — Solidity contracts, tests, deploy script
```

---

## Local Development

### Backend
```bash
cd backend
cp .env.example .env   # fill in all env vars
CGO_ENABLED=0 go run main.go
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Smart Contracts
```bash
cd smart-contracts
forge build
forge test
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $OG_RPC_URL \
  --broadcast \
  --legacy \
  --gas-price 3000000000
```

---

## Links

- **Live App**: https://voyagerfi-app.vercel.app
- **HackQuest**: https://hackquest.io/projects/setup/52f751f9-17c0-4205-9ee0-32dbbb34e292
- **Hackathon**: 0G APAC Hackathon — Track 2: Agentic Trading Arena (Verifiable Finance)
