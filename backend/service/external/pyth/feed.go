package pyth

type OHLCV struct {
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    float64 `json:"volume"`
	Timestamp int64   `json:"timestamp"`
}

// CollectOHLCV aggregates price ticks into OHLCV candles
func CollectOHLCV(prices []PriceData, intervalSeconds int64) []OHLCV {
	if len(prices) == 0 {
		return nil
	}

	var candles []OHLCV
	var current *OHLCV

	for _, p := range prices {
		bucket := (p.Timestamp / intervalSeconds) * intervalSeconds

		if current == nil || current.Timestamp != bucket {
			if current != nil {
				candles = append(candles, *current)
			}
			current = &OHLCV{
				Open:      p.Price,
				High:      p.Price,
				Low:       p.Price,
				Close:     p.Price,
				Timestamp: bucket,
			}
		} else {
			if p.Price > current.High {
				current.High = p.Price
			}
			if p.Price < current.Low {
				current.Low = p.Price
			}
			current.Close = p.Price
		}
	}

	if current != nil {
		candles = append(candles, *current)
	}

	return candles
}
