package storage

import (
	"encoding/json"
	"fmt"
)

type TradeLogEntry struct {
	PositionID   uint   `json:"position_id"`
	DecisionHash string `json:"decision_hash"`
	Reasoning    string `json:"reasoning"`
	Signals      string `json:"signals"`
	TxHash       string `json:"tx_hash"`
	Timestamp    int64  `json:"timestamp"`
}

func (c *Client) UploadTradeLog(entry *TradeLogEntry) (string, error) {
	data, err := json.Marshal(entry)
	if err != nil {
		return "", fmt.Errorf("marshal trade log: %w", err)
	}
	return c.Upload(data, fmt.Sprintf("trade_log_%d", entry.PositionID))
}
