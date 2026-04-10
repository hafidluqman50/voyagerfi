package agent

import "voyagerfi/model"

type RiskConfig struct {
	MaxPositionSize float64 // max % of balance per position
	MaxDrawdown     float64 // max drawdown before stop
	StopLossPercent float64 // stop loss per position
	MaxLeverage     uint    // max leverage allowed
}

type RiskManager struct {
	config RiskConfig
}

func NewRiskManager(config RiskConfig) *RiskManager {
	return &RiskManager{config: config}
}

func DefaultRiskConfig() RiskConfig {
	return RiskConfig{
		MaxPositionSize: 0.1, // 10% of balance
		MaxDrawdown:     0.2, // 20% max drawdown
		StopLossPercent: 0.05, // 5% stop loss
		MaxLeverage:     10,
	}
}

type PositionSizing struct {
	Margin   float64
	Leverage uint
	Approved bool
	Reason   string
}

func (rm *RiskManager) EvaluateEntry(balance float64, signal *model.Signal) PositionSizing {
	if balance <= 0 {
		return PositionSizing{Approved: false, Reason: "no balance"}
	}

	// Weak signal → skip
	strength := signal.Strength
	if strength < 0 {
		strength = -strength
	}
	if strength < 0.3 {
		return PositionSizing{Approved: false, Reason: "signal too weak"}
	}

	margin := balance * rm.config.MaxPositionSize * strength
	leverage := uint(float64(rm.config.MaxLeverage) * strength)
	if leverage < 1 {
		leverage = 1
	}

	return PositionSizing{
		Margin:   margin,
		Leverage: leverage,
		Approved: true,
	}
}
