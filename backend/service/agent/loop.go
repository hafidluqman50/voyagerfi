package agent

import (
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"voyagerfi/model"
	"voyagerfi/repository"
	"voyagerfi/service/chain"
	"voyagerfi/service/external/deepseek"
	"voyagerfi/service/external/news"
	"voyagerfi/service/external/pyth"
	"voyagerfi/service/external/storage"
	"voyagerfi/service/quant"
	websocketService "voyagerfi/service/websocket"
)

const (
	minPricesRequired = 5    // minimum price history before trading (low for demo)
	maxPriceHistory   = 50   // rolling window size
	takeProfitPct     = 0.03 // 3% take profit
	stopLossPct       = 0.05 // 5% stop loss
)

// AgentStatus is the current runtime status exposed via API
type AgentStatus struct {
	Running     bool      `json:"running"`
	LastTick    time.Time `json:"last_tick"`
	TotalTrades int       `json:"total_trades"`
	WinRate     float64   `json:"win_rate"`
	LastPrice   float64   `json:"last_price"`
	TotalTicks  int       `json:"total_ticks"`
}

type Loop struct {
	repo        *repository.Registry
	quant       *quant.Engine
	deepseek    *deepseek.Client
	pyth        *pyth.Client
	news        *news.Fetcher
	riskManager *RiskManager
	webSocketHub *websocketService.Hub
	interval    time.Duration
	stopCh      chan struct{}

	// optional chain bindings (nil = simulation mode)
	chainClient   *chain.Client
	vault         *chain.VaultBinding
	perpetual     *chain.PerpetualBinding
	priceFeed     *chain.PriceFeedBinding
	decisionLog   *chain.DecisionLogBinding
	storageAnchor *chain.StorageAnchorBinding

	// optional 0G Storage client
	storage *storage.Client

	// in-memory state per pair
	mu           sync.Mutex
	pairState    map[string]*pairData
	status       AgentStatus
}

type pairData struct {
	priceHistory []float64
	prevPrice    float64
}

func NewLoop(
	repo *repository.Registry,
	quantEngine *quant.Engine,
	deepseekClient *deepseek.Client,
	pythClient *pyth.Client,
	newsFetcher *news.Fetcher,
	riskManager *RiskManager,
	interval time.Duration,
) *Loop {
	pairState := make(map[string]*pairData)
	for _, p := range pyth.Pairs {
		pairState[p.Symbol] = &pairData{
			priceHistory: make([]float64, 0, maxPriceHistory),
		}
	}

	return &Loop{
		repo:        repo,
		quant:       quantEngine,
		deepseek:    deepseekClient,
		pyth:        pythClient,
		news:        newsFetcher,
		riskManager: riskManager,
		interval:    interval,
		stopCh:      make(chan struct{}),
		pairState:   pairState,
		status:      AgentStatus{Running: false},
	}
}

// SetChainBindings wires in on-chain capabilities (call before Start)
func (loop *Loop) SetChainBindings(
	client *chain.Client,
	vault *chain.VaultBinding,
	perpetual *chain.PerpetualBinding,
	priceFeed *chain.PriceFeedBinding,
	decisionLog *chain.DecisionLogBinding,
	storageAnchor *chain.StorageAnchorBinding,
) {
	loop.chainClient = client
	loop.vault = vault
	loop.perpetual = perpetual
	loop.priceFeed = priceFeed
	loop.decisionLog = decisionLog
	loop.storageAnchor = storageAnchor
}

// SetStorage wires in the 0G Storage client
func (loop *Loop) SetStorage(storageClient *storage.Client) {
	loop.storage = storageClient
}

// SetWSHub wires in the WebSocket hub for real-time broadcasts
func (loop *Loop) SetWSHub(hub *websocketService.Hub) {
	loop.webSocketHub = hub
}

// GetStatus returns a copy of the current agent status
func (loop *Loop) GetStatus() AgentStatus {
	loop.mu.Lock()
	defer loop.mu.Unlock()
	return loop.status
}

func (loop *Loop) Start() {
	loop.mu.Lock()
	loop.status.Running = true
	loop.mu.Unlock()

	log.Printf("Agent loop started (interval: %s)", loop.interval)
	ticker := time.NewTicker(loop.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			loop.tick()
		case <-loop.stopCh:
			loop.mu.Lock()
			loop.status.Running = false
			loop.mu.Unlock()
			log.Println("Agent loop stopped")
			return
		}
	}
}

func (loop *Loop) Stop() {
	close(loop.stopCh)
}

func (loop *Loop) tick() {
	log.Println("Agent tick: Observe → Think → Act → Log")
	loop.mu.Lock()
	loop.status.TotalTicks++
	loop.mu.Unlock()

	for _, pair := range pyth.Pairs {
		loop.tickPair(pair.Symbol, pair.PriceID)
	}
}

func (loop *Loop) tickPair(symbol, priceID string) {
	// ── 1. OBSERVE: Fetch price ──────────────────────────────────────────
	priceData, err := loop.pyth.GetPrice(priceID)
	if err != nil {
		log.Printf("[%s] Pyth price error: %v", symbol, err)
		return
	}

	currentPrice := priceData.Price
	loop.mu.Lock()
	state := loop.pairState[symbol]
	previousPrice := state.prevPrice
	state.prevPrice = currentPrice
	state.priceHistory = append(state.priceHistory, currentPrice)
	if len(state.priceHistory) > maxPriceHistory {
		state.priceHistory = state.priceHistory[1:]
	}
	priceSnapshot := make([]float64, len(state.priceHistory))
	copy(priceSnapshot, state.priceHistory)
	loop.status.LastPrice = currentPrice
	loop.mu.Unlock()

	log.Printf("[%s] $%.2f", symbol, currentPrice)

	// Push price on-chain every 6 ticks (~1 min) to save gas
	loop.mu.Lock()
	curTicks := loop.status.TotalTicks
	loop.mu.Unlock()
	if symbol == "ETH/USD" && loop.priceFeed != nil && loop.chainClient != nil && curTicks%6 == 0 {
		if _, err := loop.priceFeed.SetPrice(currentPrice); err != nil {
			log.Printf("[%s] SetPrice on-chain error: %v", symbol, err)
		}
	}

	if len(priceSnapshot) < minPricesRequired {
		log.Printf("[%s] Warming up (%d/%d)", symbol, len(priceSnapshot), minPricesRequired)
		return
	}

	// ── 2. OBSERVE: Fetch market context ────────────────────────────────
	macroContext, _ := loop.news.FetchMacro()
	asset := symbol[:len(symbol)-4] // "ETH/USD" → "ETH"
	microContext, _ := loop.news.FetchMicro(asset, currentPrice, previousPrice)
	newsContext, newsSentiment := loop.news.FetchHeadlines(asset)

	// ── 3. THINK: Quant analysis ─────────────────────────────────────────
	quantSignal, indicators := loop.quant.Analyze(priceSnapshot)
	log.Printf("[%s] Quant: %s (strength %.2f) | RSI:%.1f MACD:%.4f",
		symbol, quantSignal.Direction, quantSignal.Strength, indicators.RSI, indicators.MACD)

	// ── 4. THINK: AI reasoning via DeepSeek (0G Compute) ────────────────
	aiSignal := loop.queryAI(macroContext, microContext, newsContext, newsSentiment, currentPrice, indicators, quantSignal)

	// ── 5. THINK: Combine signals (40% quant + 60% AI) ──────────────────
	combinedSignal := CombineSignals(quantSignal, aiSignal)
	log.Printf("[%s] Combined: %s (strength %.2f)", symbol, combinedSignal.Direction, combinedSignal.Strength)

	// ── 6. ACT: Manage existing open positions for this pair ────────────
	loop.manageOpenPositions(symbol, currentPrice)

	// ── 7. ACT: Maybe open new position ─────────────────────────────────
	action := "hold"
	var transactionHash string
	openCount := loop.countOpenPositionsByPair(symbol)

	absoluteStrength := combinedSignal.Strength
	if absoluteStrength < 0 {
		absoluteStrength = -absoluteStrength
	}

	if openCount == 0 && absoluteStrength > 0.3 {
		var openErr error
		transactionHash, openErr = loop.openPosition(symbol, combinedSignal, currentPrice)
		if openErr != nil {
			log.Printf("[%s] Open position error: %v", symbol, openErr)
		} else {
			action = fmt.Sprintf("open_%s", combinedSignal.Direction)
			log.Printf("[%s] Opened %s at $%.2f tx: %s", symbol, combinedSignal.Direction, currentPrice, transactionHash)
		}
	}

	// ── 8. LOG: Build decision record ────────────────────────────────────
	reasoning := loop.buildReasoning(macroContext, microContext, newsContext, newsSentiment, indicators, combinedSignal, action)
	decisionHash := HashDecision(combinedSignal, action, reasoning)

	indicatorJSON, _ := json.Marshal(indicators)
	quantSignalID := loop.saveSignal(quantSignal, string(indicatorJSON))
	aiSignalID := loop.saveSignal(aiSignal, aiSignal.Metadata)
	signalIDs, _ := json.Marshal([]uint{quantSignalID, aiSignalID})

	decision := &model.Decision{
		DecisionHash: decisionHash,
		Action:       action,
		Reasoning:    reasoning,
		SignalIDs:    string(signalIDs),
		TxHash:       transactionHash,
	}

	// ── 9. LOG: On-chain DecisionLog — only every 6 ticks (~1 min) to save gas ──
	loop.mu.Lock()
	ticks := loop.status.TotalTicks
	loop.mu.Unlock()
	if loop.decisionLog != nil && loop.chainClient != nil && ticks%6 == 0 {
		onChainTxHash, logErr := loop.decisionLog.LogDecision(decisionHash)
		if logErr != nil {
			log.Printf("[%s] On-chain decision log error: %v", symbol, logErr)
		} else {
			decision.TxHash = onChainTxHash
			log.Printf("[%s] Decision logged on-chain: %s", symbol, onChainTxHash)
		}
	}

	if err := loop.repo.Decision.Create(decision); err != nil {
		log.Printf("[%s] Save decision error: %v", symbol, err)
	}

	// ── 10. LOG: Upload full trace to 0G Storage + anchor on-chain ───────
	go loop.uploadToStorage(decision, indicators, combinedSignal, currentPrice)

	// ── 11. Update status + broadcast ───────────────────────────────────
	loop.mu.Lock()
	loop.status.LastTick = time.Now()
	loop.mu.Unlock()

	loop.broadcastUpdate(currentPrice, combinedSignal, action)
	log.Printf("[%s] tick completed", symbol)
}

// queryAI gets a trading signal from DeepSeek via 0G Compute
func (loop *Loop) queryAI(macroContext, microContext, newsContext string, newsSentiment float64, currentPrice float64, indicators *quant.IndicatorResult, quantSignal *model.Signal) *model.Signal {
	prompt := fmt.Sprintf(`You are a crypto trading agent analyzing a crypto/USD pair.

Market Context:
- %s
- %s
- %s

Technical Indicators (at $%.2f):
- RSI: %.1f (>70 overbought, <30 oversold)
- MACD: %.4f (positive = bullish momentum)
- MA(20): %.2f
- Bollinger Z-score: %.2f (>1 near upper band, <-1 near lower)

Quant Signal: %s (strength %.2f)

Respond ONLY with JSON: {"direction":"long or short","strength":0.0-1.0,"reasoning":"max 2 sentences"}`,
		macroContext, microContext, newsContext, currentPrice,
		indicators.RSI, indicators.MACD, indicators.MA, indicators.Bollinger,
		quantSignal.Direction, quantSignal.Strength,
	)

	response, err := loop.deepseek.Chat([]deepseek.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		log.Printf("DeepSeek error: %v — using quant+news fallback", err)
		// Apply news sentiment as a 30% modifier on top of quant
		sentimentBoost := 1.0 + newsSentiment*0.3
		adjustedStrength := quantSignal.Strength * 0.5 * sentimentBoost
		if adjustedStrength > 1.0 {
			adjustedStrength = 1.0
		}
		if adjustedStrength < -1.0 {
			adjustedStrength = -1.0
		}
		label := "neutral"
		if newsSentiment > 0.2 {
			label = "bullish"
		} else if newsSentiment < -0.2 {
			label = "bearish"
		}
		return &model.Signal{
			Source:    model.SignalSourceAI,
			Direction: quantSignal.Direction,
			Strength:  adjustedStrength,
			Metadata:  fmt.Sprintf("AI unavailable; news sentiment: %s (%.2f), quant+news fallback", label, newsSentiment),
		}
	}

	var parsedResponse struct {
		Direction string  `json:"direction"`
		Strength  float64 `json:"strength"`
		Reasoning string  `json:"reasoning"`
	}
	if err := json.Unmarshal([]byte(response), &parsedResponse); err != nil {
		log.Printf("DeepSeek parse error: %v", err)
		return &model.Signal{
			Source:    model.SignalSourceAI,
			Direction: quantSignal.Direction,
			Strength:  0.3,
			Metadata:  response,
		}
	}

	direction := model.DirectionLong
	signalStrength := parsedResponse.Strength
	if parsedResponse.Direction == "short" {
		direction = model.DirectionShort
		signalStrength = -signalStrength
	}
	if signalStrength > 1.0 {
		signalStrength = 1.0
	}
	if signalStrength < -1.0 {
		signalStrength = -1.0
	}

	return &model.Signal{
		Source:    model.SignalSourceAI,
		Direction: direction,
		Strength:  signalStrength,
		Metadata:  parsedResponse.Reasoning,
	}
}

// manageOpenPositions checks stop loss / take profit for open positions of this pair only
func (loop *Loop) manageOpenPositions(pair string, currentPrice float64) {
	positions, err := loop.repo.Position.FindAllOpen()
	if err != nil {
		log.Printf("Find open positions error: %v", err)
		return
	}

	for index := range positions {
		position := &positions[index]
		if position.Pair != pair {
			continue
		}
		entryPrice := parseFloatString(position.EntryPrice)
		if entryPrice == 0 {
			continue
		}

		var profitLossPercent float64
		if position.Direction == model.DirectionLong {
			profitLossPercent = (currentPrice - entryPrice) / entryPrice
		} else {
			profitLossPercent = (entryPrice - currentPrice) / entryPrice
		}

		shouldClose := profitLossPercent >= takeProfitPct || profitLossPercent <= -stopLossPct
		if shouldClose {
			closeReason := fmt.Sprintf("pnl=%.2f%%", profitLossPercent*100)
			log.Printf("Closing position #%d (%s)", position.PositionID, closeReason)
			loop.closePosition(position, currentPrice)
		}
	}
}

// openPosition executes a new trade (on-chain or simulated)
func (loop *Loop) openPosition(pair string, combinedSignal CombinedSignal, currentPrice float64) (string, error) {
	agentAddress := loop.agentAddress()

	margin := big.NewInt(10_000_000) // 10 USDC.e default demo margin (6 decimals)
	if loop.vault != nil && loop.chainClient != nil {
		if availableBalance, err := loop.vault.GetAvailableBalance(agentAddress); err == nil && availableBalance.Sign() > 0 {
			margin = new(big.Int).Div(availableBalance, big.NewInt(10))
		}
	}

	positionSizing := loop.riskManager.EvaluateEntry(weiToEtherFloat(margin), combinedSignal.Quant)
	if !positionSizing.Approved {
		return "", fmt.Errorf("risk rejected: %s", positionSizing.Reason)
	}

	leverage := big.NewInt(int64(positionSizing.Leverage))
	tradeDirection := chain.DirectionLong
	if combinedSignal.Direction == model.DirectionShort {
		tradeDirection = chain.DirectionShort
	}

	var transactionHash string
	if loop.perpetual != nil && loop.chainClient != nil {
		var err error
		transactionHash, err = loop.perpetual.OpenPosition(agentAddress, tradeDirection, margin, leverage)
		if err != nil {
			return "", err
		}
	} else {
		transactionHash = fmt.Sprintf("sim_%d", time.Now().UnixNano())
		log.Printf("Sim open %s margin=%s leverage=%dx", combinedSignal.Direction, margin.String(), positionSizing.Leverage)
	}

	positionSize := weiToEtherFloat(margin) * float64(positionSizing.Leverage)
	newPosition := &model.Position{
		Trader:     agentAddress.Hex(),
		Pair:       pair,
		Direction:  combinedSignal.Direction,
		Size:       fmt.Sprintf("%.6f", positionSize),
		Leverage:   positionSizing.Leverage,
		EntryPrice: fmt.Sprintf("%.2f", currentPrice),
		Margin:     fmt.Sprintf("%.6f", weiToEtherFloat(margin)),
		IsOpen:     true,
		TxHash:     transactionHash,
	}
	if err := loop.repo.Position.Create(newPosition); err != nil {
		log.Printf("Save position error: %v", err)
	}

	loop.mu.Lock()
	loop.status.TotalTrades++
	loop.mu.Unlock()

	return transactionHash, nil
}

// closePosition closes an existing DB position and optionally sends on-chain tx
func (loop *Loop) closePosition(position *model.Position, currentPrice float64) string {
	var transactionHash string

	if loop.perpetual != nil && loop.chainClient != nil {
		positionID := big.NewInt(int64(position.PositionID))
		var err error
		transactionHash, err = loop.perpetual.ClosePosition(positionID)
		if err != nil {
			log.Printf("ClosePosition tx error: %v", err)
		}
	} else {
		transactionHash = fmt.Sprintf("sim_close_%d", time.Now().UnixNano())
	}

	entryPrice := parseFloatString(position.EntryPrice)
	var profitLoss float64
	if position.Direction == model.DirectionLong {
		profitLoss = (currentPrice - entryPrice) / entryPrice * 100
	} else {
		profitLoss = (entryPrice - currentPrice) / entryPrice * 100
	}

	closedAt := time.Now()
	position.IsOpen = false
	position.ExitPrice = fmt.Sprintf("%.2f", currentPrice)
	position.PnL = fmt.Sprintf("%.4f%%", profitLoss)
	position.ClosedAt = &closedAt
	if transactionHash != "" {
		position.TxHash = transactionHash
	}

	if err := loop.repo.Position.Update(position); err != nil {
		log.Printf("Update position error: %v", err)
	}

	loop.mu.Lock()
	totalTrades := loop.status.TotalTrades
	if totalTrades > 0 {
		previousWins := loop.status.WinRate * float64(totalTrades)
		if profitLoss > 0 {
			previousWins++
		}
		loop.status.WinRate = previousWins / float64(totalTrades)
	}
	loop.mu.Unlock()

	return transactionHash
}

func (loop *Loop) saveSignal(signal *model.Signal, metadata string) uint {
	// ensure metadata is valid JSON for jsonb column
	if len(metadata) == 0 {
		metadata = `""`
	} else if metadata[0] != '{' && metadata[0] != '[' && metadata[0] != '"' {
		b, _ := json.Marshal(metadata)
		metadata = string(b)
	}
	signal.Metadata = metadata
	if err := loop.repo.Signal.Create(signal); err != nil {
		log.Printf("Save signal error: %v", err)
		return 0
	}
	return signal.ID
}

func (loop *Loop) countOpenPositionsByPair(pair string) int {
	positions, err := loop.repo.Position.FindOpenByPair(pair)
	if err != nil {
		return 0
	}
	return len(positions)
}

func (loop *Loop) agentAddress() common.Address {
	if loop.chainClient != nil {
		return loop.chainClient.Address()
	}
	return common.HexToAddress("0x0000000000000000000000000000000000000001")
}

func (loop *Loop) buildReasoning(macroContext, microContext, newsContext string, newsSentiment float64, indicators *quant.IndicatorResult, combinedSignal CombinedSignal, action string) string {
	return fmt.Sprintf(
		"action=%s dir=%s strength=%.2f rsi=%.1f macd=%.4f ma=%.2f bb=%.2f news=%.2f | %s | %s | %s",
		action, combinedSignal.Direction, combinedSignal.Strength,
		indicators.RSI, indicators.MACD, indicators.MA, indicators.Bollinger,
		newsSentiment, macroContext, microContext, newsContext,
	)
}

func (loop *Loop) broadcastUpdate(currentPrice float64, combinedSignal CombinedSignal, action string) {
	if loop.webSocketHub == nil {
		return
	}
	message, _ := json.Marshal(map[string]interface{}{
		"type":      "tick",
		"price":     currentPrice,
		"direction": combinedSignal.Direction,
		"strength":  combinedSignal.Strength,
		"action":    action,
		"timestamp": time.Now().Unix(),
	})
	loop.webSocketHub.Broadcast(message)
}

// uploadToStorage uploads the full decision trace to 0G Storage and anchors on-chain
func (loop *Loop) uploadToStorage(decision *model.Decision, indicators *quant.IndicatorResult, combinedSignal CombinedSignal, currentPrice float64) {
	if loop.storage == nil {
		return
	}

	payload := map[string]interface{}{
		"decision_id":   decision.ID,
		"decision_hash": decision.DecisionHash,
		"action":        decision.Action,
		"reasoning":     decision.Reasoning,
		"price":         currentPrice,
		"indicators":    indicators,
		"direction":     combinedSignal.Direction,
		"strength":      combinedSignal.Strength,
		"timestamp":     time.Now().Unix(),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("0G Storage marshal error: %v", err)
		return
	}

	storageMetadata := fmt.Sprintf("voyagerfi_decision_%d", decision.ID)
	rootHash, err := loop.storage.Upload(payloadBytes, storageMetadata)
	if err != nil {
		log.Printf("0G Storage upload error: %v", err)
		return
	}
	if rootHash == "" {
		return // no credentials configured
	}

	log.Printf("0G Storage uploaded: root=%s", rootHash)

	decision.StorageRoot = rootHash
	if updateErr := loop.repo.Decision.Update(decision); updateErr != nil {
		log.Printf("Update decision storage root error: %v", updateErr)
	}

	if loop.storageAnchor != nil && loop.chainClient != nil {
		anchorTxHash, anchorErr := loop.storageAnchor.Anchor(rootHash, storageMetadata)
		if anchorErr != nil {
			log.Printf("StorageAnchor tx error: %v", anchorErr)
		} else {
			log.Printf("StorageAnchor anchored: tx=%s", anchorTxHash)
		}
	}
}

func parseFloatString(value string) float64 {
	var result float64
	fmt.Sscanf(value, "%f", &result)
	return result
}

func weiToEtherFloat(usdcValue *big.Int) float64 {
	floatValue, _ := new(big.Float).SetInt(usdcValue).Float64()
	return floatValue / 1e6 // USDC.e has 6 decimals
}
