package quant

func calcMA(prices []float64, period int) float64 {
	if len(prices) < period {
		return 0
	}
	sum := 0.0
	for _, p := range prices[len(prices)-period:] {
		sum += p
	}
	return sum / float64(period)
}
