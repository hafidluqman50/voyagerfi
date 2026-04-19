package pyth

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"time"
)

// Well-known Pyth price feed IDs
const (
	ETHUSDPriceID = "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
	BTCUSDPriceID = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
	SOLUSDPriceID = "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
	ARBUSDPriceID = "3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5"
	BNBUSDPriceID = "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f"
)

// Pairs is the canonical list of supported trading pairs
var Pairs = []struct {
	Symbol  string
	PriceID string
}{
	{"ETH/USD", ETHUSDPriceID},
	{"BTC/USD", BTCUSDPriceID},
	{"SOL/USD", SOLUSDPriceID},
	{"ARB/USD", ARBUSDPriceID},
	{"BNB/USD", BNBUSDPriceID},
}

type Client struct {
	contract string
	http     *http.Client
}

func NewClient(contract string) *Client {
	return &Client{
		contract: contract,
		http:     &http.Client{Timeout: 5 * time.Second},
	}
}

type PriceData struct {
	Price       float64 `json:"price"`
	Timestamp   int64   `json:"timestamp"`
	PriceID     string  `json:"price_id"`
	Change24hPct float64 `json:"change_24h_pct"`
}

type hermesResponse struct {
	Parsed []struct {
		ID    string `json:"id"`
		Price struct {
			Price string `json:"price"`
			Expo  int    `json:"expo"`
			Conf  string `json:"conf"`
			PublishTime int64 `json:"publish_time"`
		} `json:"price"`
		PrevPrice struct {
			Price string `json:"price"`
			Expo  int    `json:"expo"`
		} `json:"ema_price"`
	} `json:"parsed"`
}

// GetPrice fetches the latest price from Pyth Hermes REST API
func (c *Client) GetPrice(priceID string) (*PriceData, error) {
	url := fmt.Sprintf("https://hermes.pyth.network/v2/updates/price/latest?ids[]=%s&parsed=true", priceID)

	resp, err := c.http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("fetch price: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("pyth API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var result hermesResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if len(result.Parsed) == 0 {
		return nil, fmt.Errorf("no price data returned")
	}

	p := result.Parsed[0]

	priceInt, err := strconv.ParseInt(p.Price.Price, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse price value: %w", err)
	}

	price := float64(priceInt) * math.Pow10(p.Price.Expo)

	return &PriceData{
		Price:     price,
		Timestamp: p.Price.PublishTime,
		PriceID:   p.ID,
	}, nil
}

// GetETHPrice is a convenience wrapper for ETH/USD
func (c *Client) GetETHPrice() (*PriceData, error) {
	return c.GetPrice(ETHUSDPriceID)
}

// GetBTCPrice is a convenience wrapper for BTC/USD
func (c *Client) GetBTCPrice() (*PriceData, error) {
	return c.GetPrice(BTCUSDPriceID)
}
