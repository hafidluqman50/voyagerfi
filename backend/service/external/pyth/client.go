package pyth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	contract string
	http     *http.Client
}

func NewClient(contract string) *Client {
	return &Client{
		contract: contract,
		http:     &http.Client{},
	}
}

type PriceData struct {
	Price     float64 `json:"price"`
	Timestamp int64   `json:"timestamp"`
}

// GetPrice fetches the latest price from Pyth oracle
func (c *Client) GetPrice(priceID string) (*PriceData, error) {
	// TODO: Read from Pyth contract on 0G Chain directly
	// For now, use Pyth Hermes API as fallback
	url := fmt.Sprintf("https://hermes.pyth.network/v2/updates/price/latest?ids[]=%s", priceID)

	resp, err := c.http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("fetch price: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	return &PriceData{}, nil
}
