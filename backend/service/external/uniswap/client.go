package uniswap

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	geth "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Arbitrum One contract addresses
const (
	SwapRouter02Mainnet = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"
	WETHMainnet         = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
	USDCMainnet         = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
	WBTCMainnet         = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"
	ARBMainnet          = "0x912CE59144191C1204E64559FE8253a0e49E6548"

	// Arbitrum Sepolia (testnet) — WBTC/ARB need mock deployment
	SwapRouter02Sepolia = "0x101F443B4d1b059569D643917553c771E1b9663E"
	WETHSepolia         = "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73"
	USDCSepolia         = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
	WBTCSepolia         = "" // deploy MockWBTC to use on Sepolia
	ARBSepolia          = "" // deploy MockARB to use on Sepolia

	// 0.05% fee tier — most liquid pools on Arbitrum
	FeeTier uint32 = 500

	DefaultSlippageBps = 50 // 0.5%
)

const routerABIJSON = `[{"inputs":[{"components":[
	{"internalType":"address","name":"tokenIn","type":"address"},
	{"internalType":"address","name":"tokenOut","type":"address"},
	{"internalType":"uint24","name":"fee","type":"uint24"},
	{"internalType":"address","name":"recipient","type":"address"},
	{"internalType":"uint256","name":"amountIn","type":"uint256"},
	{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},
	{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}
],"internalType":"struct IV3SwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],
"name":"exactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],
"stateMutability":"payable","type":"function"}]`

const erc20ABIJSON = `[
{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]`

const vaultABIJSON = `[
{"inputs":[{"name":"amount","type":"uint256"}],"name":"allocate","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"inputs":[{"name":"returned","type":"uint256"}],"name":"settle","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"inputs":[],"name":"poolBalance","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"deployedAmount","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
]`

type swapParams struct {
	TokenIn           common.Address
	TokenOut          common.Address
	Fee               *big.Int // uint24 in Solidity → *big.Int in Go ABI
	Recipient         common.Address
	AmountIn          *big.Int
	AmountOutMinimum  *big.Int
	SqrtPriceLimitX96 *big.Int
}

type Client struct {
	rpc        *ethclient.Client
	privateKey *ecdsa.PrivateKey
	address    common.Address
	chainID    *big.Int

	routerAddr  common.Address
	usdcAddr    common.Address
	vaultAddr   common.Address
	tokens      map[string]common.Address // symbol → token address (ETH, BTC, ARB)
	slippageBps int                       // 0 on testnet (no liquidity), 50 on mainnet

	routerABI abi.ABI
	erc20ABI  abi.ABI
	vaultABI  abi.ABI
}

// TokenOverrides allows injecting custom token addresses (e.g. mock tokens on Sepolia).
type TokenOverrides struct {
	WBTC string
	ARB  string
}

func NewClient(rpcURL, privateKeyHex, vaultAddress string, mainnet bool, overrides ...TokenOverrides) (*Client, error) {
	rpc, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("dial Arbitrum RPC: %w", err)
	}

	pk, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}

	address := crypto.PubkeyToAddress(*pk.Public().(*ecdsa.PublicKey))

	routerABIParsed, _ := abi.JSON(strings.NewReader(routerABIJSON))
	erc20ABIParsed, _ := abi.JSON(strings.NewReader(erc20ABIJSON))
	vaultABIParsed, _ := abi.JSON(strings.NewReader(vaultABIJSON))

	var routerAddr, wethAddr, usdcAddr, wbtcAddr, arbAddr string
	if mainnet {
		routerAddr, wethAddr, usdcAddr = SwapRouter02Mainnet, WETHMainnet, USDCMainnet
		wbtcAddr, arbAddr = WBTCMainnet, ARBMainnet
	} else {
		routerAddr, wethAddr, usdcAddr = SwapRouter02Sepolia, WETHSepolia, USDCSepolia
		wbtcAddr, arbAddr = WBTCSepolia, ARBSepolia
	}

	tokens := map[string]common.Address{
		"ETH": common.HexToAddress(wethAddr),
		"BTC": common.HexToAddress(wbtcAddr),
		"ARB": common.HexToAddress(arbAddr),
	}

	// Apply overrides (mock tokens on testnet)
	if len(overrides) > 0 {
		if overrides[0].WBTC != "" {
			tokens["BTC"] = common.HexToAddress(overrides[0].WBTC)
		}
		if overrides[0].ARB != "" {
			tokens["ARB"] = common.HexToAddress(overrides[0].ARB)
		}
	}

	slippageBps := DefaultSlippageBps
	if !mainnet {
		slippageBps = 0 // Sepolia has near-zero liquidity; skip slippage check
	}

	return &Client{
		rpc:         rpc,
		privateKey:  pk,
		address:     address,
		routerAddr:  common.HexToAddress(routerAddr),
		usdcAddr:    common.HexToAddress(usdcAddr),
		vaultAddr:   common.HexToAddress(vaultAddress),
		tokens:      tokens,
		slippageBps: slippageBps,
		routerABI:   routerABIParsed,
		erc20ABI:    erc20ABIParsed,
		vaultABI:    vaultABIParsed,
	}, nil
}

func (c *Client) Address() string {
	return c.address.Hex()
}

// ── Vault lifecycle ───────────────────────────────────────────────────────────

// LiquidBalance returns vault poolBalance - deployedAmount (available USDC, 6 decimals).
func (c *Client) LiquidBalance() (*big.Int, error) {
	callPool, err := c.vaultABI.Pack("poolBalance")
	if err != nil {
		return nil, err
	}
	callDeployed, err := c.vaultABI.Pack("deployedAmount")
	if err != nil {
		return nil, err
	}
	pool, err := c.rpc.CallContract(context.Background(), geth.CallMsg{To: &c.vaultAddr, Data: callPool}, nil)
	if err != nil {
		return nil, err
	}
	deployed, err := c.rpc.CallContract(context.Background(), geth.CallMsg{To: &c.vaultAddr, Data: callDeployed}, nil)
	if err != nil {
		return nil, err
	}
	poolBal := new(big.Int).SetBytes(pool)
	deployedBal := new(big.Int).SetBytes(deployed)
	liquid := new(big.Int).Sub(poolBal, deployedBal)
	if liquid.Sign() < 0 {
		liquid.SetInt64(0)
	}
	return liquid, nil
}

// Allocate pulls amountUSDC (6 decimals) from vault to agent wallet for trading.
func (c *Client) Allocate(amountUSDC *big.Int) (string, error) {
	data, err := c.vaultABI.Pack("allocate", amountUSDC)
	if err != nil {
		return "", fmt.Errorf("pack allocate: %w", err)
	}
	return c.sendTx(c.vaultAddr, data, nil, 100_000)
}

// Settle returns USDC to vault after trading. Agent approves vault first.
func (c *Client) Settle(amountUSDC *big.Int) (string, error) {
	approveTx, err := c.approveToken(c.usdcAddr, c.vaultAddr, amountUSDC)
	if err != nil {
		return "", fmt.Errorf("approve vault for settle: %w", err)
	}
	if err := c.WaitMined(approveTx); err != nil {
		return "", fmt.Errorf("approve wait: %w", err)
	}
	data, err := c.vaultABI.Pack("settle", amountUSDC)
	if err != nil {
		return "", fmt.Errorf("pack settle: %w", err)
	}
	return c.sendTx(c.vaultAddr, data, nil, 100_000)
}

// ── Uniswap V3 swaps ─────────────────────────────────────────────────────────

// SwapUSDCToToken buys tokenSymbol (ETH/BTC/ARB) with amountUSDC (6 decimals).
// Returns token amount received.
func (c *Client) SwapUSDCToToken(symbol string, amountUSDC *big.Int) (*big.Int, string, error) {
	tokenAddr, ok := c.tokens[symbol]
	if !ok || tokenAddr == (common.Address{}) {
		return nil, "", fmt.Errorf("unsupported or unconfigured token: %s", symbol)
	}

	approveTx, err := c.approveToken(c.usdcAddr, c.routerAddr, amountUSDC)
	if err != nil {
		return nil, "", fmt.Errorf("approve USDC: %w", err)
	}
	if err := c.WaitMined(approveTx); err != nil {
		return nil, "", fmt.Errorf("approve USDC wait: %w", err)
	}

	minOut := applySlippage(amountUSDC, c.slippageBps)
	data, err := c.routerABI.Pack("exactInputSingle", swapParams{
		TokenIn: c.usdcAddr, TokenOut: tokenAddr, Fee: new(big.Int).SetUint64(uint64(FeeTier)),
		Recipient: c.address, AmountIn: amountUSDC, AmountOutMinimum: minOut,
		SqrtPriceLimitX96: big.NewInt(0),
	})
	if err != nil {
		return nil, "", fmt.Errorf("pack swap USDC→%s: %w", symbol, err)
	}

	txHash, err := c.sendTx(c.routerAddr, data, nil, 250_000)
	if err != nil {
		return nil, "", fmt.Errorf("swap USDC→%s tx: %w", symbol, err)
	}
	_ = c.WaitMined(txHash)

	bal, _ := c.tokenBalance(tokenAddr, c.address)
	return bal, txHash, nil
}

// SwapTokenToUSDC sells tokenSymbol (ETH/BTC/ARB). Returns USDC received (6 decimals).
func (c *Client) SwapTokenToUSDC(symbol string, amount *big.Int) (*big.Int, string, error) {
	tokenAddr, ok := c.tokens[symbol]
	if !ok || tokenAddr == (common.Address{}) {
		return nil, "", fmt.Errorf("unsupported or unconfigured token: %s", symbol)
	}

	approveTx, err := c.approveToken(tokenAddr, c.routerAddr, amount)
	if err != nil {
		return nil, "", fmt.Errorf("approve %s: %w", symbol, err)
	}
	if err := c.WaitMined(approveTx); err != nil {
		return nil, "", fmt.Errorf("approve %s wait: %w", symbol, err)
	}

	minOut := applySlippage(amount, c.slippageBps)
	data, err := c.routerABI.Pack("exactInputSingle", swapParams{
		TokenIn: tokenAddr, TokenOut: c.usdcAddr, Fee: new(big.Int).SetUint64(uint64(FeeTier)),
		Recipient: c.address, AmountIn: amount, AmountOutMinimum: minOut,
		SqrtPriceLimitX96: big.NewInt(0),
	})
	if err != nil {
		return nil, "", fmt.Errorf("pack swap %s→USDC: %w", symbol, err)
	}

	txHash, err := c.sendTx(c.routerAddr, data, nil, 250_000)
	if err != nil {
		return nil, "", fmt.Errorf("swap %s→USDC tx: %w", symbol, err)
	}
	_ = c.WaitMined(txHash)

	usdcBal, _ := c.tokenBalance(c.usdcAddr, c.address)
	return usdcBal, txHash, nil
}

// SettleAgentBalance returns all USDC in the agent wallet back to the vault.
// Used for recovery after a failed swap left funds stranded in the agent wallet.
func (c *Client) SettleAgentBalance() (*big.Int, error) {
	bal, err := c.tokenBalance(c.usdcAddr, c.address)
	if err != nil {
		return nil, fmt.Errorf("read agent USDC balance: %w", err)
	}
	if bal.Sign() == 0 {
		return big.NewInt(0), nil
	}
	_, err = c.Settle(bal)
	if err != nil {
		return nil, fmt.Errorf("settle: %w", err)
	}
	return bal, nil
}

// ── Internal helpers ──────────────────────────────────────────────────────────

func (c *Client) approveToken(token, spender common.Address, amount *big.Int) (string, error) {
	data, err := c.erc20ABI.Pack("approve", spender, amount)
	if err != nil {
		return "", err
	}
	return c.sendTx(token, data, nil, 60_000)
}

func (c *Client) tokenBalance(token, account common.Address) (*big.Int, error) {
	data, err := c.erc20ABI.Pack("balanceOf", account)
	if err != nil {
		return big.NewInt(0), err
	}
	msg := geth.CallMsg{From: c.address, To: &token, Data: data}
	result, err := c.rpc.CallContract(context.Background(), msg, nil)
	if err != nil || len(result) < 32 {
		return big.NewInt(0), err
	}
	return new(big.Int).SetBytes(result[:32]), nil
}

func (c *Client) sendTx(to common.Address, data []byte, value *big.Int, gasLimit uint64) (string, error) {
	ctx := context.Background()

	nonce, err := c.rpc.PendingNonceAt(ctx, c.address)
	if err != nil {
		return "", fmt.Errorf("nonce: %w", err)
	}
	gasPrice, err := c.rpc.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("gas price: %w", err)
	}
	// 30% buffer to avoid maxFeePerGas < baseFee on Arbitrum
	gasPrice = new(big.Int).Mul(gasPrice, big.NewInt(130))
	gasPrice.Div(gasPrice, big.NewInt(100))

	if c.chainID == nil {
		c.chainID, err = c.rpc.ChainID(ctx)
		if err != nil {
			return "", fmt.Errorf("chain id: %w", err)
		}
	}

	tx := types.NewTransaction(nonce, to, value, gasLimit, gasPrice, data)
	signed, err := types.SignTx(tx, types.NewEIP155Signer(c.chainID), c.privateKey)
	if err != nil {
		return "", fmt.Errorf("sign: %w", err)
	}
	if err := c.rpc.SendTransaction(ctx, signed); err != nil {
		return "", fmt.Errorf("send: %w", err)
	}
	return signed.Hash().Hex(), nil
}

// WaitMined polls until the transaction is included in a block, then checks status.
func (c *Client) WaitMined(txHashHex string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	hash := common.HexToHash(txHashHex)
	for {
		receipt, err := c.rpc.TransactionReceipt(ctx, hash)
		if err == nil {
			if receipt.Status == 0 {
				return fmt.Errorf("tx %s reverted on-chain", txHashHex)
			}
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("tx %s not mined within 60s", txHashHex)
		default:
			time.Sleep(500 * time.Millisecond)
		}
	}
}

// applySlippage reduces amount by bps basis points to get minimum amount out.
func applySlippage(amount *big.Int, bps int) *big.Int {
	result := new(big.Int).Set(amount)
	result.Mul(result, big.NewInt(int64(10000-bps)))
	result.Div(result, big.NewInt(10000))
	return result
}
