# VoyagerFi Smart Contracts

Solidity contracts for VoyagerFi — autonomous AI trading agent (0G APAC Hackathon Track 2).

## Architecture

Two deployment targets:

| Contract | Chain | Purpose |
|---|---|---|
| `Vault.sol` | Arbitrum | USDC custody, share-based NAV, fee collection |
| `DecisionLog.sol` | 0G Chain Mainnet | On-chain hash of every AI trade decision |
| `StorageAnchor.sol` | 0G Chain Mainnet | Anchor 0G Storage roots for verifiable reasoning trace |

## Deployed Addresses

### Arbitrum Sepolia (testnet)
| Contract | Address |
|---|---|
| Vault | `0xab02481724D53675762A360f53A1456827Ad37E5` |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |

### 0G Chain Mainnet
| Contract | Address |
|---|---|
| DecisionLog | — |
| StorageAnchor | — |

## Fee Model (2 and 20)

- **2% management fee** — accrued per second from AUM, pulled anytime by owner
- **20% performance fee** — pulled per epoch on realized profit above high-water mark
- **0.1% withdrawal fee** — deducted automatically on every user withdraw

## Folder Structure

```
src/
├── core/
│   └── Vault.sol           # Main vault — deposit, withdraw, allocate, settle
├── verify/
│   ├── DecisionLog.sol     # 0G Chain: log decision hashes
│   └── StorageAnchor.sol   # 0G Chain: anchor storage roots
├── interfaces/
│   ├── IVault.sol
│   ├── IDecisionLog.sol
│   └── IAgentRegistry.sol  # (removed)
├── libraries/
│   ├── Errors.sol
│   └── MathLib.sol
└── mocks/
    └── MockUSDC.sol        # ERC20 mock for tests only

script/
├── DeployArbitrum.s.sol    # Deploy Vault to Arbitrum
└── DeployOG.s.sol          # Deploy DecisionLog + StorageAnchor to 0G Chain

test/
└── Vault.t.sol
```

## Setup

Copy env and fill in values:

```shell
cp .env.example .env
```

Required vars:
```
DEPLOYER_PRIVATE_KEY=
USDC_ADDRESS=0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
FEE_COLLECTOR=
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

## Commands

```shell
forge build
forge test
forge test -vvv          # verbose

# Deploy Vault → Arbitrum Sepolia
forge script script/DeployArbitrum.s.sol:DeployArbitrum \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deploy verifiability contracts → 0G Chain Mainnet
forge script script/DeployOG.s.sol:DeployOG \
  --rpc-url https://evmrpc.0g.ai \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```
