package repository

import (
	"voyagerfi/model"

	"gorm.io/gorm"
)

type PositionRepository struct {
	db *gorm.DB
}

func NewPositionRepository(db *gorm.DB) *PositionRepository {
	return &PositionRepository{db: db}
}

func (r *PositionRepository) Create(position *model.Position) error {
	return r.db.Create(position).Error
}

func (r *PositionRepository) Update(position *model.Position) error {
	return r.db.Save(position).Error
}

func (r *PositionRepository) FindByID(id uint) (*model.Position, error) {
	var position model.Position
	err := r.db.First(&position, id).Error
	return &position, err
}

func (r *PositionRepository) FindOpenByTrader(trader string) ([]model.Position, error) {
	var positions []model.Position
	err := r.db.Where("trader = ? AND is_open = ?", trader, true).Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) FindByTrader(trader string) ([]model.Position, error) {
	var positions []model.Position
	err := r.db.Where("trader = ?", trader).Order("created_at DESC").Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) FindOpenByPair(pair string) ([]model.Position, error) {
	var positions []model.Position
	err := r.db.Where("is_open = ? AND pair = ?", true, pair).Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) FindAllOpen() ([]model.Position, error) {
	var positions []model.Position
	err := r.db.Where("is_open = ?", true).Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) FindAll() ([]model.Position, error) {
	var positions []model.Position
	err := r.db.Order("created_at DESC").Find(&positions).Error
	return positions, err
}

func (r *PositionRepository) DB() *gorm.DB {
	return r.db
}
