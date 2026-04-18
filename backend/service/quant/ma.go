package quant

func calcMA(prices []float64, period int) float64 {
	if len(prices) < period {
		return 0
	}
	sum := 0.0
	for _, price := range prices[len(prices)-period:] {
		sum += price
	}
	return sum / float64(period)
}
