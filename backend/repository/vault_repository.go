package repository

import (
	"voyagerfi/model"

	"gorm.io/gorm"
)

type VaultRepository struct {
	db *gorm.DB
}

func NewVaultRepository(db *gorm.DB) *VaultRepository {
	return &VaultRepository{db: db}
}

func (r *VaultRepository) Create(event *model.VaultEvent) error {
	return r.db.Create(event).Error
}

func (r *VaultRepository) FindByUser(user string) ([]model.VaultEvent, error) {
	var events []model.VaultEvent
	err := r.db.Where("user = ?", user).Order("created_at DESC").Find(&events).Error
	return events, err
}
