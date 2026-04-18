package news

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type Fetcher struct {
	http *http.Client
}

func NewFetcher() *Fetcher {
	return &Fetcher{
		http: &http.Client{Timeout: 5 * time.Second},
	}
}

type MarketContext struct {
	MarketCapChangeUSD float64 `json:"market_cap_change_24h_usd"`
	ActiveCryptos      int     `json:"active_cryptocurrencies"`
	BTCDominance       float64 `json:"market_cap_percentage_btc"`
	ETHDominance       float64 `json:"market_cap_percentage_eth"`
}

type coinGeckoGlobalResponse struct {
	Data struct {
		ActiveCryptocurrencies          int                `json:"active_cryptocurrencies"`
		MarketCapChangePercentage24hUSD float64            `json:"market_cap_change_percentage_24h_usd"`
		MarketCapPercentage             map[string]float64 `json:"market_cap_percentage"`
	} `json:"data"`
}

// FetchMacro returns a macro market context string for AI reasoning
func (f *Fetcher) FetchMacro() (string, error) {
	resp, err := f.http.Get("https://api.coingecko.com/api/v3/global")
	if err != nil {
		log.Printf("CoinGecko fetch error: %v", err)
		return "Global crypto market data unavailable", nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "Global crypto market data unavailable", nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "Global crypto market data unavailable", nil
	}

	var result coinGeckoGlobalResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "Global crypto market data unavailable", nil
	}

	d := result.Data
	sentiment := "neutral"
	if d.MarketCapChangePercentage24hUSD > 2 {
		sentiment = "bullish"
	} else if d.MarketCapChangePercentage24hUSD < -2 {
		sentiment = "bearish"
	}

	context := fmt.Sprintf(
		"Global crypto market: 24h market cap change %.2f%% (%s sentiment). BTC dominance %.1f%%, ETH dominance %.1f%%.",
		d.MarketCapChangePercentage24hUSD,
		sentiment,
		d.MarketCapPercentage["btc"],
		d.MarketCapPercentage["eth"],
	)

	return context, nil
}

// FetchMicro returns token-specific context based on price action
func (f *Fetcher) FetchMicro(token string, currentPrice, prevPrice float64) (string, error) {
	if prevPrice <= 0 {
		return fmt.Sprintf("%s/USD current price: $%.2f", token, currentPrice), nil
	}

	changePct := ((currentPrice - prevPrice) / prevPrice) * 100
	sentiment := "flat"
	if changePct > 0.5 {
		sentiment = "upward momentum"
	} else if changePct < -0.5 {
		sentiment = "downward pressure"
	}

	return fmt.Sprintf(
		"%s/USD: $%.2f (%.2f%% since last tick, %s).",
		token, currentPrice, changePct, sentiment,
	), nil
}
