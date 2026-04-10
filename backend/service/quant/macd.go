package quant

func calcMACD(prices []float64) float64 {
	ema12 := calcEMA(prices, 12)
	ema26 := calcEMA(prices, 26)
	return ema12 - ema26
}

func calcEMA(prices []float64, period int) float64 {
	if len(prices) < period {
		return 0
	}

	multiplier := 2.0 / float64(period+1)
	ema := calcMA(prices[:period], period)

	for i := period; i < len(prices); i++ {
		ema = (prices[i]-ema)*multiplier + ema
	}

	return ema
}
