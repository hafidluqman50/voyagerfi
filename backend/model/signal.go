package model

import "time"

type SignalSource string

const (
	SignalSourceQuant SignalSource = "quant"
	SignalSourceAI    SignalSource = "ai"
)

type Signal struct {
	ID        uint         `json:"id" gorm:"primaryKey"`
	Source    SignalSource `json:"source"`
	Direction Direction    `json:"direction"`
	Strength  float64      `json:"strength"` // -1.0 (strong bearish) to 1.0 (strong bullish)
	Metadata  string       `json:"metadata" gorm:"type:jsonb"` // raw indicator data or LLM reasoning
	CreatedAt time.Time    `json:"created_at"`
}
