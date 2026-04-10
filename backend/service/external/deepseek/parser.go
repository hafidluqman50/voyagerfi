package deepseek

import (
	"encoding/json"
	"fmt"
	"voyagerfi/model"
)

type AISignal struct {
	Direction string  `json:"direction"`
	Strength  float64 `json:"strength"`
	Reasoning string  `json:"reasoning"`
}

func ParseSignal(raw string) (*model.Signal, string, error) {
	var aiSignal AISignal
	if err := json.Unmarshal([]byte(raw), &aiSignal); err != nil {
		return nil, "", fmt.Errorf("parse AI response: %w", err)
	}

	direction := model.DirectionLong
	if aiSignal.Direction == "short" {
		direction = model.DirectionShort
	}

	signal := &model.Signal{
		Source:    model.SignalSourceAI,
		Direction: direction,
		Strength:  aiSignal.Strength,
	}

	return signal, aiSignal.Reasoning, nil
}
