package quant

func calcRSI(prices []float64, period int) float64 {
	if len(prices) < period+1 {
		return 50
	}

	gains := 0.0
	losses := 0.0

	for i := len(prices) - period; i < len(prices); i++ {
		change := prices[i] - prices[i-1]
		if change > 0 {
			gains += change
		} else {
			losses -= change
		}
	}

	avgGain := gains / float64(period)
	avgLoss := losses / float64(period)

	if avgLoss == 0 {
		return 100
	}

	rs := avgGain / avgLoss
	return 100 - (100 / (1 + rs))
}
