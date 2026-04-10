package model

import "time"

type TradeLog struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	PositionID  uint      `json:"position_id"`
	DecisionID  uint      `json:"decision_id"`
	StorageHash string    `json:"storage_hash"` // 0G Storage hash
	AnchorTx    string    `json:"anchor_tx"`    // StorageAnchor tx hash
	CreatedAt   time.Time `json:"created_at"`
}
