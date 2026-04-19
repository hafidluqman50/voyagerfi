package news

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
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

var headlineSources = []struct {
	URL    string
	Source string
}{
	{"https://cointelegraph.com/rss", "CoinTelegraph"},
	{"https://coindesk.com/arc/outboundfeeds/rss/", "CoinDesk"},
}

var bullishWords = []string{"surge", "rally", "bull", "gain", "rise", "soar", "pump", "high", "positive", "bullish", "growth", "adoption", "breakout", "record", "recovery"}
var bearishWords = []string{"crash", "drop", "bear", "loss", "fall", "plunge", "dump", "low", "negative", "bearish", "decline", "fear", "ban", "hack", "warning", "selloff"}

type rssSimpleFeed struct {
	Channel struct {
		Items []struct {
			Title string `xml:"title"`
		} `xml:"item"`
	} `xml:"channel"`
}

// FetchHeadlines fetches RSS news, scores sentiment for the given asset, and returns a
// context string plus a sentiment float in [-1, 1] (positive = bullish).
func (f *Fetcher) FetchHeadlines(asset string) (string, float64) {
	var titles []string
	for _, src := range headlineSources {
		resp, err := f.http.Get(src.URL)
		if err != nil {
			log.Printf("News RSS fetch error (%s): %v", src.Source, err)
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		var feed rssSimpleFeed
		if err := xml.Unmarshal(body, &feed); err != nil {
			continue
		}
		for i, item := range feed.Channel.Items {
			if i >= 5 {
				break
			}
			titles = append(titles, item.Title)
		}
	}

	if len(titles) == 0 {
		return "No recent news headlines", 0
	}

	assetLower := strings.ToLower(asset)
	bull, bear, relevant := 0, 0, 0
	var contextLines []string

	for _, title := range titles {
		lower := strings.ToLower(title)
		isMacro := strings.Contains(lower, "crypto") || strings.Contains(lower, "bitcoin") ||
			strings.Contains(lower, "market") || strings.Contains(lower, "defi") ||
			strings.Contains(lower, "blockchain")
		isAsset := strings.Contains(lower, assetLower)
		if !isMacro && !isAsset {
			continue
		}
		relevant++
		for _, kw := range bullishWords {
			if strings.Contains(lower, kw) {
				bull++
			}
		}
		for _, kw := range bearishWords {
			if strings.Contains(lower, kw) {
				bear++
			}
		}
		if len(contextLines) < 3 {
			contextLines = append(contextLines, "- "+title)
		}
	}

	sentiment := 0.0
	if bull+bear > 0 {
		sentiment = float64(bull-bear) / float64(bull+bear)
	}
	label := "neutral"
	if sentiment > 0.2 {
		label = "bullish"
	} else if sentiment < -0.2 {
		label = "bearish"
	}

	context := fmt.Sprintf(
		"News sentiment: %s (bull:%d bear:%d, %d headlines scored). Recent: %s",
		label, bull, bear, relevant,
		strings.Join(contextLines, " | "),
	)
	return context, sentiment
}
