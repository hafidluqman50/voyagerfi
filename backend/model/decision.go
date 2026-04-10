package model

import "time"

type Decision struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	DecisionHash string    `json:"decision_hash"`
	StorageRoot  string    `json:"storage_root"`
	Action       string    `json:"action"` // "open_long", "open_short", "close", "hold"
	Reasoning    string    `json:"reasoning" gorm:"type:text"`
	SignalIDs    string    `json:"signal_ids" gorm:"type:jsonb"` // array of signal IDs used
	TxHash       string    `json:"tx_hash"`
	CreatedAt    time.Time `json:"created_at"`
}
