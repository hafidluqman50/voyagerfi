package quant

import "voyagerfi/model"

func interpretSignal(result *IndicatorResult) (model.Direction, float64) {
	score := 0.0

	// RSI: oversold = bullish, overbought = bearish
	if result.RSI < 30 {
		score += 0.3
	} else if result.RSI > 70 {
		score -= 0.3
	}

	// MACD: positive = bullish, negative = bearish
	if result.MACD > 0 {
		score += 0.3
	} else {
		score -= 0.3
	}

	// Bollinger: near lower = bullish, near upper = bearish
	score -= result.Bollinger * 0.4

	direction := model.DirectionLong
	if score < 0 {
		direction = model.DirectionShort
	}

	// Clamp to [-1, 1]
	if score > 1 {
		score = 1
	} else if score < -1 {
		score = -1
	}

	return direction, score
}
