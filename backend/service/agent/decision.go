package agent

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"voyagerfi/model"
)

type CombinedSignal struct {
	Quant     *model.Signal
	AI        *model.Signal
	Direction model.Direction
	Strength  float64
}

// CombineSignals merges quant and AI signals into a final trading decision
func CombineSignals(quant *model.Signal, ai *model.Signal) CombinedSignal {
	// Weight: 40% quant, 60% AI
	quantWeight := 0.4
	aiWeight := 0.6

	combinedStrength := quant.Strength*quantWeight + ai.Strength*aiWeight

	direction := model.DirectionLong
	if combinedStrength < 0 {
		direction = model.DirectionShort
	}

	return CombinedSignal{
		Quant:     quant,
		AI:        ai,
		Direction: direction,
		Strength:  combinedStrength,
	}
}

// HashDecision creates a deterministic hash of the trading decision for on-chain verification
func HashDecision(signal CombinedSignal, action string, reasoning string) string {
	payload := map[string]interface{}{
		"direction":      signal.Direction,
		"strength":       signal.Strength,
		"quant_strength": signal.Quant.Strength,
		"ai_strength":    signal.AI.Strength,
		"action":         action,
		"reasoning":      reasoning,
	}

	data, _ := json.Marshal(payload)
	hash := sha256.Sum256(data)
	return fmt.Sprintf("0x%x", hash)
}
