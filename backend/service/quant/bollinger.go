package quant

import "math"

func calcBollinger(prices []float64, period int) float64 {
	if len(prices) < period {
		return 0
	}

	movingAverage := calcMA(prices, period)
	recentPrices := prices[len(prices)-period:]

	variance := 0.0
	for _, price := range recentPrices {
		deviation := price - movingAverage
		variance += deviation * deviation
	}
	standardDeviation := math.Sqrt(variance / float64(period))

	currentPrice := prices[len(prices)-1]

	// Return position relative to bands: -1 (lower band) to +1 (upper band)
	if standardDeviation == 0 {
		return 0
	}
	return (currentPrice - movingAverage) / (2 * standardDeviation)
}
