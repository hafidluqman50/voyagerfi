package quant

import "math"

func calcBollinger(prices []float64, period int) float64 {
	if len(prices) < period {
		return 0
	}

	ma := calcMA(prices, period)
	recent := prices[len(prices)-period:]

	variance := 0.0
	for _, p := range recent {
		diff := p - ma
		variance += diff * diff
	}
	stdDev := math.Sqrt(variance / float64(period))

	currentPrice := prices[len(prices)-1]

	// Return position relative to bands: -1 (lower band) to +1 (upper band)
	if stdDev == 0 {
		return 0
	}
	return (currentPrice - ma) / (2 * stdDev)
}
