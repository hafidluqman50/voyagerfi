package market

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// Fetcher fetches derivatives market structure data (funding rates, open interest)
// from Binance Futures REST API — free, no API key required.
type Fetcher struct {
	http *http.Client
}

func NewFetcher() *Fetcher {
	return &Fetcher{http: &http.Client{Timeout: 5 * time.Second}}
}

type FundingData struct {
	Symbol      string
	FundingRate float64 // positive = longs pay shorts (bearish pressure), negative = shorts pay longs (bullish pressure)
	Signal      string  // "bullish", "bearish", "neutral"
	Context     string  // human-readable summary for AI prompt
}

// FetchFundingRate retrieves the latest funding rate for the given Binance symbol (e.g. "ETHUSDT").
func (f *Fetcher) FetchFundingRate(symbol string) (*FundingData, error) {
	url := fmt.Sprintf("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=%s", strings.ToUpper(symbol))
	resp, err := f.http.Get(url)
	if err != nil {
		return fallbackFundingData(symbol), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fallbackFundingData(symbol), nil
	}

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Symbol          string `json:"symbol"`
		LastFundingRate string `json:"lastFundingRate"`
		MarkPrice       string `json:"markPrice"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("funding rate parse error: %v", err)
		return fallbackFundingData(symbol), nil
	}

	rate, _ := strconv.ParseFloat(result.LastFundingRate, 64)
	ratePct := rate * 100

	signal := "neutral"
	if rate < -0.0001 {
		// Shorts pay longs → squeeze potential → bullish
		signal = "bullish"
	} else if rate > 0.0001 {
		// Longs pay shorts → overleveraged longs → bearish pressure
		signal = "bearish"
	}

	context := fmt.Sprintf(
		"Derivatives: %s funding rate %.4f%% (%s signal — %s)",
		symbol, ratePct, signal,
		fundingRateExplain(rate),
	)

	return &FundingData{
		Symbol:      symbol,
		FundingRate: rate,
		Signal:      signal,
		Context:     context,
	}, nil
}

func fundingRateExplain(rate float64) string {
	if rate > 0.0003 {
		return "significantly overleveraged longs, high squeeze risk"
	} else if rate > 0.0001 {
		return "longs dominant, mild bearish pressure"
	} else if rate < -0.0003 {
		return "significantly overleveraged shorts, high short squeeze risk"
	} else if rate < -0.0001 {
		return "shorts dominant, mild bullish pressure"
	}
	return "balanced positioning"
}

func fallbackFundingData(symbol string) *FundingData {
	return &FundingData{
		Symbol:      symbol,
		FundingRate: 0,
		Signal:      "neutral",
		Context:     fmt.Sprintf("Derivatives: %s funding rate unavailable (neutral assumed)", symbol),
	}
}
