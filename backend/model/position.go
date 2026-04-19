package model

import "time"

type Direction string

const (
	DirectionLong  Direction = "long"
	DirectionShort Direction = "short"
)

type Position struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	Trader     string     `json:"trader" gorm:"index"`
	Pair       string     `json:"pair" gorm:"index"`
	Direction  Direction  `json:"direction"`
	Size       string     `json:"size"`
	Leverage   uint       `json:"leverage"`
	EntryPrice string     `json:"entry_price"`
	ExitPrice  string     `json:"exit_price"`
	Margin     string     `json:"margin"`
	PnL        string     `json:"pnl"`
	IsOpen     bool       `json:"is_open" gorm:"index"`
	TxHash     string     `json:"tx_hash"`
	PositionID uint       `json:"position_id"`
	CreatedAt  time.Time  `json:"created_at"`
	ClosedAt   *time.Time `json:"closed_at"`
}
