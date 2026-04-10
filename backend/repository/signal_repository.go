package repository

import (
	"voyagerfi/model"

	"gorm.io/gorm"
)

type SignalRepository struct {
	db *gorm.DB
}

func NewSignalRepository(db *gorm.DB) *SignalRepository {
	return &SignalRepository{db: db}
}

func (r *SignalRepository) Create(signal *model.Signal) error {
	return r.db.Create(signal).Error
}

func (r *SignalRepository) FindLatest(limit int) ([]model.Signal, error) {
	var signals []model.Signal
	err := r.db.Order("created_at DESC").Limit(limit).Find(&signals).Error
	return signals, err
}
