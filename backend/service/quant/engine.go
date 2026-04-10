package quant

import "voyagerfi/model"

type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}

type IndicatorResult struct {
	MA        float64 `json:"ma"`
	RSI       float64 `json:"rsi"`
	MACD      float64 `json:"macd"`
	Bollinger float64 `json:"bollinger"`
}

func (e *Engine) Analyze(prices []float64) (*model.Signal, *IndicatorResult) {
	result := &IndicatorResult{
		MA:        calcMA(prices, 20),
		RSI:       calcRSI(prices, 14),
		MACD:      calcMACD(prices),
		Bollinger: calcBollinger(prices, 20),
	}

	direction, strength := interpretSignal(result)

	signal := &model.Signal{
		Source:    model.SignalSourceQuant,
		Direction: direction,
		Strength:  strength,
	}

	return signal, result
}
