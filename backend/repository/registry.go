package repository

import "gorm.io/gorm"

type Registry struct {
	Position *PositionRepository
	Vault    *VaultRepository
	Signal   *SignalRepository
	Decision *DecisionRepository
	TradeLog *TradeLogRepository
}

func NewRegistry(db *gorm.DB) *Registry {
	return &Registry{
		Position: NewPositionRepository(db),
		Vault:    NewVaultRepository(db),
		Signal:   NewSignalRepository(db),
		Decision: NewDecisionRepository(db),
		TradeLog: NewTradeLogRepository(db),
	}
}
