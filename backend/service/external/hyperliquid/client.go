package hyperliquid

import (
	"bytes"
	"crypto/ecdsa"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

const (
	TestnetURL = "https://api.hyperliquid-testnet.xyz"
	MainnetURL = "https://api.hyperliquid.xyz"

	// Demo trade size in USD per position
	DefaultTradeSizeUSD = 10.0
	DefaultLeverage     = 10
)

type Client struct {
	baseURL    string
	privateKey *ecdsa.PrivateKey
	address    common.Address
	httpClient *http.Client
	isMainnet  bool
	assetMeta  []assetMeta
}

type assetMeta struct {
	Name       string `json:"name"`
	SzDecimals int    `json:"szDecimals"`
}

type Position struct {
	Coin          string
	IsLong        bool
	Size          float64
	EntryPrice    float64
	UnrealizedPnl float64
}

// ── Constructor ──────────────────────────────────────────────────────────────

func NewClient(privateKeyHex string, isMainnet bool) (*Client, error) {
	privateKeyHex = strings.TrimPrefix(privateKeyHex, "0x")
	keyBytes, err := hex.DecodeString(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("hyperliquid: invalid private key: %w", err)
	}
	privateKey, err := crypto.ToECDSA(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("hyperliquid: invalid private key: %w", err)
	}

	baseURL := TestnetURL
	if isMainnet {
		baseURL = MainnetURL
	}

	c := &Client{
		baseURL:    baseURL,
		privateKey: privateKey,
		address:    crypto.PubkeyToAddress(privateKey.PublicKey),
		httpClient: &http.Client{Timeout: 15 * time.Second},
		isMainnet:  isMainnet,
	}
	return c, nil
}

func (c *Client) Address() string { return c.address.Hex() }

// ── Meta / asset lookup ───────────────────────────────────────────────────────

func (c *Client) FetchMeta() error {
	body, _ := json.Marshal(map[string]string{"type": "meta"})
	resp, err := c.httpClient.Post(c.baseURL+"/info", "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var result struct {
		Universe []assetMeta `json:"universe"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}
	c.assetMeta = result.Universe
	return nil
}

var fallbackAssetIndex = map[string][2]int{
	"BTC": {3, 5},
	"ETH": {1, 4},
	"SOL": {5, 2},
	"ARB": {8, 1},
	"BNB": {10, 2},
}

func (c *Client) assetIndexFor(coin string) (idx int, szDecimals int) {
	for i, a := range c.assetMeta {
		if a.Name == coin {
			return i, a.SzDecimals
		}
	}
	if d, ok := fallbackAssetIndex[coin]; ok {
		return d[0], d[1]
	}
	return 0, 4
}

// ── Public trading methods ───────────────────────────────────────────────────

// MarketOpen opens a long or short market position for coin at currentPrice.
func (c *Client) MarketOpen(coin string, isLong bool, currentPrice float64) error {
	idx, szDec := c.assetIndexFor(coin)
	sz := formatSize(DefaultTradeSizeUSD/currentPrice, szDec)

	var limitPx string
	if isLong {
		limitPx = formatPrice(currentPrice * 1.05) // 5% slippage → guaranteed fill
	} else {
		limitPx = formatPrice(currentPrice * 0.95)
	}

	return c.sendOrder(idx, isLong, limitPx, sz, false)
}

// ClosePosition closes an open position with a reduce-only order.
func (c *Client) ClosePosition(coin string, isLong bool, size float64, currentPrice float64) error {
	idx, szDec := c.assetIndexFor(coin)
	sz := formatSize(size, szDec)
	isBuy := !isLong // close long = sell, close short = buy

	var limitPx string
	if isBuy {
		limitPx = formatPrice(currentPrice * 1.05)
	} else {
		limitPx = formatPrice(currentPrice * 0.95)
	}

	return c.sendOrder(idx, isBuy, limitPx, sz, true)
}

// GetPositions returns all open positions for the agent wallet.
func (c *Client) GetPositions() ([]Position, error) {
	body, _ := json.Marshal(map[string]string{
		"type": "clearinghouseState",
		"user": c.address.Hex(),
	})
	resp, err := c.httpClient.Post(c.baseURL+"/info", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var state struct {
		AssetPositions []struct {
			Position struct {
				Coin          string `json:"coin"`
				Szi           string `json:"szi"` // signed size (negative = short)
				EntryPx       string `json:"entryPx"`
				UnrealizedPnl string `json:"unrealizedPnl"`
			} `json:"position"`
		} `json:"assetPositions"`
	}
	if err := json.Unmarshal(raw, &state); err != nil {
		return nil, fmt.Errorf("clearinghouseState parse: %w", err)
	}

	var positions []Position
	for _, ap := range state.AssetPositions {
		sz := parseFloat(ap.Position.Szi)
		if sz == 0 {
			continue
		}
		positions = append(positions, Position{
			Coin:          ap.Position.Coin,
			IsLong:        sz > 0,
			Size:          abs(sz),
			EntryPrice:    parseFloat(ap.Position.EntryPx),
			UnrealizedPnl: parseFloat(ap.Position.UnrealizedPnl),
		})
	}
	return positions, nil
}

// UpdateLeverage sets isolated leverage for a coin (call once at startup per pair).
func (c *Client) UpdateLeverage(coin string, leverage int) error {
	idx, _ := c.assetIndexFor(coin)
	nonce := time.Now().UnixMilli()

	action := map[string]interface{}{
		"type":     "updateLeverage",
		"asset":    idx,
		"isCross":  false,
		"leverage": leverage,
	}

	actionBytes := encodeLeverageMsgpack(idx, leverage)
	sig, err := c.sign(actionBytes, nonce)
	if err != nil {
		return err
	}

	return c.postExchange(action, nonce, sig)
}

// ── Internal order submission ─────────────────────────────────────────────────

func (c *Client) sendOrder(assetIdx int, isBuy bool, limitPx, sz string, reduceOnly bool) error {
	nonce := time.Now().UnixMilli()

	actionMsgpack := encodeOrderMsgpack(assetIdx, isBuy, limitPx, sz, reduceOnly)
	sig, err := c.sign(actionMsgpack, nonce)
	if err != nil {
		return err
	}

	actionJSON := map[string]interface{}{
		"type": "order",
		"orders": []map[string]interface{}{
			{
				"a": assetIdx,
				"b": isBuy,
				"p": limitPx,
				"s": sz,
				"r": reduceOnly,
				"t": map[string]interface{}{
					"limit": map[string]string{"tif": "Ioc"},
				},
			},
		},
		"grouping": "na",
	}

	return c.postExchange(actionJSON, nonce, sig)
}

// ── Signing ───────────────────────────────────────────────────────────────────

type sigRSV struct {
	R string `json:"r"`
	S string `json:"s"`
	V int    `json:"v"`
}

func (c *Client) sign(actionMsgpack []byte, nonce int64) (sigRSV, error) {
	// connectionId = keccak256(actionMsgpack + nonce(8 bytes BE) + 0x00)
	nonceBytes := bigEndian8(uint64(nonce))
	raw := append(actionMsgpack, nonceBytes...)
	raw = append(raw, 0x00) // no vault address

	connectionId := crypto.Keccak256Hash(raw)

	// EIP-712 phantom agent
	source := "b" // testnet
	if c.isMainnet {
		source = "a"
	}
	finalHash := c.phantomAgentHash(source, connectionId)

	sig, err := crypto.Sign(finalHash.Bytes(), c.privateKey)
	if err != nil {
		return sigRSV{}, err
	}

	r := "0x" + hex.EncodeToString(sig[:32])
	s := "0x" + hex.EncodeToString(sig[32:64])
	v := int(sig[64]) + 27

	return sigRSV{R: r, S: s, V: v}, nil
}

func (c *Client) phantomAgentHash(source string, connectionId common.Hash) common.Hash {
	// Domain separator
	domainTypeHash := crypto.Keccak256Hash([]byte(
		"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
	))
	nameHash := crypto.Keccak256Hash([]byte("Exchange"))
	versionHash := crypto.Keccak256Hash([]byte("1"))
	chainId := common.LeftPadBytes(big.NewInt(1337).Bytes(), 32)
	verifyingContract := common.LeftPadBytes(common.HexToAddress("0x0000000000000000000000000000000000000000").Bytes(), 32)

	domainSeparator := crypto.Keccak256Hash(
		domainTypeHash.Bytes(),
		nameHash.Bytes(),
		versionHash.Bytes(),
		chainId,
		verifyingContract,
	)

	// Struct hash for Agent(string source, bytes32 connectionId)
	agentTypeHash := crypto.Keccak256Hash([]byte("Agent(string source,bytes32 connectionId)"))
	sourceHash := crypto.Keccak256Hash([]byte(source))

	structHash := crypto.Keccak256Hash(
		agentTypeHash.Bytes(),
		sourceHash.Bytes(),
		connectionId.Bytes(),
	)

	// Final: "\x19\x01" + domainSeparator + structHash
	return crypto.Keccak256Hash(
		[]byte("\x19\x01"),
		domainSeparator.Bytes(),
		structHash.Bytes(),
	)
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

func (c *Client) postExchange(action interface{}, nonce int64, sig sigRSV) error {
	payload := map[string]interface{}{
		"action":    action,
		"nonce":     nonce,
		"signature": sig,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(c.baseURL+"/exchange", "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	var result struct {
		Status   string `json:"status"`
		Response struct {
			Data struct {
				Statuses []struct {
					Error  string `json:"error"`
					Filled struct{} `json:"filled"`
				} `json:"statuses"`
			} `json:"data"`
		} `json:"response"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return fmt.Errorf("hyperliquid response parse: %w (body: %s)", err, raw)
	}
	if result.Status != "ok" {
		return fmt.Errorf("hyperliquid error: %s", raw)
	}
	if len(result.Response.Data.Statuses) > 0 {
		if errMsg := result.Response.Data.Statuses[0].Error; errMsg != "" {
			return fmt.Errorf("hyperliquid order error: %s", errMsg)
		}
	}
	return nil
}

// ── Manual msgpack encoding (minimal, for hash computation only) ──────────────
//
// Hyperliquid requires msgpack-encoded action bytes for the action hash.
// We encode the specific structures manually to avoid adding a dependency.

func encodeOrderMsgpack(assetIdx int, isBuy bool, limitPx, sz string, reduceOnly bool) []byte {
	var b []byte

	// fixmap with 3 keys: type, orders, grouping
	b = append(b, 0x83)
	b = append(b, fixstr("type")...)
	b = append(b, fixstr("order")...)
	b = append(b, fixstr("orders")...)

	// fixarray with 1 order
	b = append(b, 0x91)

	// order item: fixmap with 6 keys: a, b, p, s, r, t
	b = append(b, 0x86)
	b = append(b, fixstr("a")...)
	b = append(b, encodeInt(assetIdx)...)
	b = append(b, fixstr("b")...)
	b = append(b, encodeBool(isBuy)...)
	b = append(b, fixstr("p")...)
	b = append(b, fixstr(limitPx)...)
	b = append(b, fixstr("s")...)
	b = append(b, fixstr(sz)...)
	b = append(b, fixstr("r")...)
	b = append(b, encodeBool(reduceOnly)...)
	b = append(b, fixstr("t")...)

	// t: fixmap {limit: fixmap {tif: "Ioc"}}
	b = append(b, 0x81) // fixmap 1 key
	b = append(b, fixstr("limit")...)
	b = append(b, 0x81) // fixmap 1 key
	b = append(b, fixstr("tif")...)
	b = append(b, fixstr("Ioc")...)

	b = append(b, fixstr("grouping")...)
	b = append(b, fixstr("na")...)

	return b
}

func encodeLeverageMsgpack(assetIdx, leverage int) []byte {
	var b []byte
	// fixmap 4 keys: type, asset, isCross, leverage
	b = append(b, 0x84)
	b = append(b, fixstr("type")...)
	b = append(b, fixstr("updateLeverage")...)
	b = append(b, fixstr("asset")...)
	b = append(b, encodeInt(assetIdx)...)
	b = append(b, fixstr("isCross")...)
	b = append(b, encodeBool(false)...)
	b = append(b, fixstr("leverage")...)
	b = append(b, encodeInt(leverage)...)
	return b
}

func fixstr(s string) []byte {
	b := make([]byte, 1+len(s))
	b[0] = 0xa0 | byte(len(s)) // fixstr prefix
	copy(b[1:], s)
	return b
}

func encodeBool(v bool) []byte {
	if v {
		return []byte{0xc3}
	}
	return []byte{0xc2}
}

func encodeInt(v int) []byte {
	if v >= 0 && v <= 127 {
		return []byte{byte(v)} // positive fixint
	}
	// uint8
	return []byte{0xcc, byte(v)}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func bigEndian8(v uint64) []byte {
	b := make([]byte, 8)
	b[0] = byte(v >> 56)
	b[1] = byte(v >> 48)
	b[2] = byte(v >> 40)
	b[3] = byte(v >> 32)
	b[4] = byte(v >> 24)
	b[5] = byte(v >> 16)
	b[6] = byte(v >> 8)
	b[7] = byte(v)
	return b
}

func formatSize(sz float64, decimals int) string {
	format := fmt.Sprintf("%%.%df", decimals)
	return fmt.Sprintf(format, sz)
}

func formatPrice(px float64) string {
	return fmt.Sprintf("%.2f", px)
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
