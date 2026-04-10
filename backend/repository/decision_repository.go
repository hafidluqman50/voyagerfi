package repository

import (
	"voyagerfi/model"

	"gorm.io/gorm"
)

type DecisionRepository struct {
	db *gorm.DB
}

func NewDecisionRepository(db *gorm.DB) *DecisionRepository {
	return &DecisionRepository{db: db}
}

func (r *DecisionRepository) Create(decision *model.Decision) error {
	return r.db.Create(decision).Error
}

func (r *DecisionRepository) FindLatest(limit int) ([]model.Decision, error) {
	var decisions []model.Decision
	err := r.db.Order("created_at DESC").Limit(limit).Find(&decisions).Error
	return decisions, err
}

func (r *DecisionRepository) FindByID(id uint) (*model.Decision, error) {
	var decision model.Decision
	err := r.db.First(&decision, id).Error
	return &decision, err
}
