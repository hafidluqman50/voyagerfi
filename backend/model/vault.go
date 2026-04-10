package model

import "time"

type VaultEvent struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	User      string    `json:"user" gorm:"index"`
	EventType string    `json:"event_type"` // "deposit" or "withdraw"
	Amount    string    `json:"amount"`
	TxHash    string    `json:"tx_hash"`
	CreatedAt time.Time `json:"created_at"`
}
