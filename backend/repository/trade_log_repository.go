package repository

import (
	"voyagerfi/model"

	"gorm.io/gorm"
)

type TradeLogRepository struct {
	db *gorm.DB
}

func NewTradeLogRepository(db *gorm.DB) *TradeLogRepository {
	return &TradeLogRepository{db: db}
}

func (r *TradeLogRepository) Create(log *model.TradeLog) error {
	return r.db.Create(log).Error
}

func (r *TradeLogRepository) FindByPositionID(positionID uint) (*model.TradeLog, error) {
	var tradeLog model.TradeLog
	err := r.db.Where("position_id = ?", positionID).First(&tradeLog).Error
	return &tradeLog, err
}
