package agent

import (
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"time"

	"voyagerfi/model"
	"voyagerfi/repository"
	"voyagerfi/service/chain"
	"voyagerfi/service/external/deepseek"
	"voyagerfi/service/external/market"
	"voyagerfi/service/external/news"
	"voyagerfi/service/external/pyth"
	"voyagerfi/service/external/storage"
	"voyagerfi/service/external/uniswap"
	"voyagerfi/service/quant"
	websocketService "voyagerfi/service/websocket"
)

const (
	minPricesRequired = 5
	maxPriceHistory   = 50
	takeProfitPct     = 0.04 // 4% take profit
	stopLossPct       = 0.03 // 3% stop loss

	// USDC allocation per trade: 2 USDC (6 decimals = 2_000_000)
	tradeSizeUSDC = 2_000_000
)

type AgentStatus struct {
	Running     bool      `json:"running"`
	LastTick    time.Time `json:"last_tick"`
	TotalTrades int       `json:"total_trades"`
	WinRate     float64   `json:"win_rate"`
	LastPrice   float64   `json:"last_price"`
	TotalTicks  int       `json:"total_ticks"`
}

type Loop struct {
	repo          *repository.Registry
	quant         *quant.Engine
	deepseek      *deepseek.Client
	pyth          *pyth.Client
	news          *news.Fetcher
	marketFetcher *market.Fetcher
	riskManager   *RiskManager
	webSocketHub  *websocketService.Hub
	interval      time.Duration
	stopCh        chan struct{}

	// Uniswap V3 execution layer on Arbitrum (nil = simulation mode)
	uni *uniswap.Client

	// 0G Chain verifiability layer (nil = skip on-chain logging)
	chainClient   *chain.Client
	decisionLog   *chain.DecisionLogBinding
	storageAnchor *chain.StorageAnchorBinding

	// 0G Storage
	storage *storage.Client

	mu        sync.Mutex
	pairState map[string]*pairData
	status    AgentStatus

	forceTick chan struct{}
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
	marketFetcher *market.Fetcher,
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
		repo:          repo,
		quant:         quantEngine,
		deepseek:      deepseekClient,
		pyth:          pythClient,
		news:          newsFetcher,
		marketFetcher: marketFetcher,
		riskManager:   riskManager,
		interval:      interval,
		stopCh:        make(chan struct{}),
		forceTick:     make(chan struct{}, 1),
		pairState:     pairState,
		status:        AgentStatus{Running: false},
	}
}

func (loop *Loop) SetUniswap(uni *uniswap.Client) {
	loop.uni = uni
}

func (loop *Loop) SetChainBindings(
	client *chain.Client,
	decisionLog *chain.DecisionLogBinding,
	storageAnchor *chain.StorageAnchorBinding,
) {
	loop.chainClient = client
	loop.decisionLog = decisionLog
	loop.storageAnchor = storageAnchor
}

func (loop *Loop) SetStorage(storageClient *storage.Client) {
	loop.storage = storageClient
}

func (loop *Loop) SetWSHub(hub *websocketService.Hub) {
	loop.webSocketHub = hub
}

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
		case <-loop.forceTick:
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

// ForceTick triggers an immediate agent cycle (non-blocking if one is already queued).
func (loop *Loop) ForceTick() {
	select {
	case loop.forceTick <- struct{}{}:
	default:
	}
}

// ForceTestTrade bypasses signal logic and directly attempts Allocate + Swap on ETH.
// Only for verifying on-chain execution. Returns step-by-step result.
func (loop *Loop) ForceTestTrade() map[string]string {
	result := map[string]string{}
	if loop.uni == nil {
		result["error"] = "uniswap client not initialized"
		return result
	}

	liquid, err := loop.uni.LiquidBalance()
	if err != nil {
		result["error"] = "balance check failed: " + err.Error()
		return result
	}
	result["liquid_balance_raw"] = liquid.String()

	allocAmount := big.NewInt(tradeSizeUSDC)
	if liquid.Cmp(allocAmount) < 0 {
		result["error"] = "insufficient vault balance"
		return result
	}

	allocTx, err := loop.uni.Allocate(allocAmount)
	if err != nil {
		result["error"] = "allocate failed: " + err.Error()
		return result
	}
	result["allocate_tx"] = allocTx
	if err := loop.uni.WaitMined(allocTx); err != nil {
		result["error"] = "allocate wait: " + err.Error()
		return result
	}

	tokenReceived, swapTx, err := loop.uni.SwapUSDCToToken("ETH", allocAmount)
	if err != nil {
		result["error"] = "swap failed: " + err.Error()
		_ = loop.settleVault(allocAmount)
		return result
	}
	result["swap_tx"] = swapTx
	result["token_received"] = tokenReceived.String()
	return result
}

func (loop *Loop) Stop() {
	close(loop.stopCh)
}

// RecoverVault settles all USDC currently in the agent wallet back to the vault.
// Call this after a swap revert to return stranded funds.
func (loop *Loop) RecoverVault() map[string]string {
	result := map[string]string{}
	if loop.uni == nil {
		result["error"] = "uniswap client not initialized"
		return result
	}
	settled, err := loop.uni.SettleAgentBalance()
	if err != nil {
		result["error"] = err.Error()
		return result
	}
	result["settled_usdc_raw"] = settled.String()
	result["settled_usdc"] = fmt.Sprintf("%.6f", float64(settled.Int64())/1e6)
	return result
}

func (loop *Loop) tick() {
	loop.mu.Lock()
	loop.status.TotalTicks++
	loop.mu.Unlock()
	log.Println("Agent tick: Observe → Analyze (4 layers) → Think (DeepSeek TEE) → Act → Log")

	for _, pair := range pyth.Pairs {
		loop.tickPair(pair.Symbol, pair.PriceID, pair.DisplayPair, pair.TradeAsset)
	}
}

func (loop *Loop) tickPair(symbol, priceID, displayPair, tradeAsset string) {
	// ── LAYER 1: OBSERVE — Fetch price & build technical state ───────────────
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

	if len(priceSnapshot) < minPricesRequired {
		log.Printf("[%s] Warming up (%d/%d)", symbol, len(priceSnapshot), minPricesRequired)
		return
	}

	// ── LAYER 1: Technical Analysis ──────────────────────────────────────────
	quantSignal, indicators := loop.quant.Analyze(priceSnapshot)
	log.Printf("[%s] Technical: %s (strength %.2f) | RSI:%.1f MACD:%.4f",
		symbol, quantSignal.Direction, quantSignal.Strength, indicators.RSI, indicators.MACD)

	// ── LAYER 2: Macro Intelligence ───────────────────────────────────────────
	macroContext, _ := loop.news.FetchMacro()

	// ── LAYER 3: Sentiment Intelligence ──────────────────────────────────────
	priceContext, _ := loop.news.FetchMicro(tradeAsset, currentPrice, previousPrice)
	newsContext, newsSentiment := loop.news.FetchHeadlines(tradeAsset)

	// ── LAYER 4: Derivatives Intelligence (Funding Rate) ─────────────────────
	fundingData, _ := loop.marketFetcher.FetchFundingRate(symbol)

	// ── THINK: Synthesize all 4 layers via DeepSeek (0G Compute TEE) ─────────
	aiSignal := loop.queryAI(
		symbol, currentPrice, previousPrice,
		indicators, quantSignal,
		macroContext, priceContext, newsContext, newsSentiment,
		fundingData,
	)

	// ── THINK: Final decision — AI-driven (no fixed quant weight) ─────────────
	finalSignal := loop.resolveSignal(quantSignal, aiSignal)
	log.Printf("[%s] Decision: %s (confidence %.2f)", symbol, finalSignal.Direction, finalSignal.Strength)

	// ── ACT: Manage open positions (take profit / stop loss) ─────────────────
	loop.manageOpenPositions(displayPair, currentPrice)

	// ── ACT: Open new position if signal strong enough ────────────────────────
	action := "monitor"
	var txHash string
	openCount := loop.countOpenPositionsByPair(displayPair)

	// For SPOT: only buy when signal is positively bullish. Negative = bearish = stay in USDC.
	if openCount == 0 && finalSignal.Strength > 0.35 {
		canTrade := true
		if loop.uni != nil {
			liquid, balErr := loop.uni.LiquidBalance()
			if balErr != nil {
				log.Printf("[%s] Balance check error: %v", symbol, balErr)
				canTrade = false
			} else if liquid.Int64() < tradeSizeUSDC {
				log.Printf("[%s] Insufficient vault liquid balance (%d USDC raw) — skipping trade", symbol, liquid.Int64())
				canTrade = false
			}
		}
		if canTrade {
			var openErr error
			txHash, openErr = loop.openPosition(displayPair, tradeAsset, finalSignal, currentPrice)
			if openErr != nil {
				log.Printf("[%s] Open position error: %v", symbol, openErr)
			} else {
				action = fmt.Sprintf("buy_%s", tradeAsset)
				log.Printf("[%s] Opened long @ $%.2f", symbol, currentPrice)
			}
		}
	}

	// ── LOG: Build decision record ────────────────────────────────────────────
	reasoning := loop.buildReasoning(
		macroContext, priceContext, newsContext, newsSentiment,
		fundingData, indicators, finalSignal, action,
	)
	decisionHash := HashDecision(finalSignal, action, reasoning)

	indicatorJSON, _ := json.Marshal(indicators)
	qSigID := loop.saveSignal(quantSignal, string(indicatorJSON))
	aiSigID := loop.saveSignal(aiSignal, aiSignal.Metadata)
	signalIDs, _ := json.Marshal([]uint{qSigID, aiSigID})

	decision := &model.Decision{
		DecisionHash: decisionHash,
		Action:       action,
		Reasoning:    reasoning,
		SignalIDs:    string(signalIDs),
		TxHash:       txHash,
	}

	// ── LOG: 0G Chain DecisionLog — every 3 ticks ─────────────────────────────
	loop.mu.Lock()
	ticks := loop.status.TotalTicks
	loop.mu.Unlock()
	if loop.decisionLog != nil && loop.chainClient != nil && ticks%3 == 0 {
		onChainTx, logErr := loop.decisionLog.LogDecision(decisionHash)
		if logErr != nil {
			log.Printf("[%s] 0G Chain decision log error: %v", symbol, logErr)
		} else {
			decision.TxHash = onChainTx
			log.Printf("[%s] Decision anchored on 0G Chain: %s", symbol, onChainTx)
		}
	}

	if err := loop.repo.Decision.Create(decision); err != nil {
		log.Printf("[%s] Save decision error: %v", symbol, err)
	}

	// ── LOG: Upload full trace to 0G Storage ──────────────────────────────────
	go loop.uploadToStorage(decision, indicators, finalSignal, currentPrice)

	loop.mu.Lock()
	loop.status.LastTick = time.Now()
	loop.mu.Unlock()

	loop.broadcastUpdate(currentPrice, finalSignal, action)
}

// ── Multi-Modal AI Reasoning (0G Compute / DeepSeek TEE) ─────────────────────
// Synthesizes 4 intelligence layers: Technical + Macro + Sentiment + Derivatives.
// This is VoyagerFi's core differentiator — not rule-based quant, but holistic AI judgment.
func (loop *Loop) queryAI(
	symbol string, currentPrice, prevPrice float64,
	indicators *quant.IndicatorResult, quantSignal *model.Signal,
	macroContext, priceContext, newsContext string, newsSentiment float64,
	funding *market.FundingData,
) *model.Signal {
	var fundingCtx string
	if funding != nil {
		fundingCtx = funding.Context
	} else {
		fundingCtx = "Derivatives data unavailable"
	}

	prompt := fmt.Sprintf(`You are VoyagerFi's trading agent — an autonomous AI that manages user deposits in a shared USDC vault on Arbitrum.
You synthesize 4 intelligence layers to make a spot trading decision (buy ETH with USDC, or stay in USDC):

━━ LAYER 1 — TECHNICAL ANALYSIS ━━
Asset: %s @ $%.2f (prev: $%.2f)
RSI(14): %.1f  [>70=overbought, <30=oversold]
MACD: %.5f  [positive=bullish momentum]
MA(20): $%.2f  [price %s MA = %s]
Bollinger Z-score: %.2f  [>1=near upper band, <-1=near lower]
Quant signal: %s (strength %.2f)

━━ LAYER 2 — MACRO INTELLIGENCE ━━
%s

━━ LAYER 3 — SENTIMENT INTELLIGENCE ━━
%s
%s (raw sentiment score: %.2f)

━━ LAYER 4 — DERIVATIVES INTELLIGENCE ━━
%s

━━ TASK ━━
Reason step-by-step across all 4 layers. Identify convergence or divergence.
Output ONLY valid JSON — no markdown, no explanation outside JSON:
{"direction":"long","strength":0.65,"reasoning":"2-3 sentence chain-of-thought explaining the cross-layer logic"}

direction must be "long" (buy ETH) or "neutral" (stay in USDC).
strength: 0.0-1.0 (your conviction level).`,
		symbol, currentPrice, prevPrice,
		indicators.RSI,
		indicators.MACD,
		indicators.MA,
		maRelation(currentPrice, indicators.MA), maTrend(currentPrice, indicators.MA),
		indicators.Bollinger,
		quantSignal.Direction, quantSignal.Strength,
		macroContext,
		priceContext, newsContext, newsSentiment,
		fundingCtx,
	)

	response, err := loop.deepseek.Chat([]deepseek.Message{
		{Role: "user", Content: prompt},
	})
	if err != nil {
		log.Printf("DeepSeek error: %v — falling back to quant+sentiment", err)
		return loop.fallbackSignal(quantSignal, newsSentiment)
	}

	var parsed struct {
		Direction string  `json:"direction"`
		Strength  float64 `json:"strength"`
		Reasoning string  `json:"reasoning"`
	}
	if err := json.Unmarshal([]byte(response), &parsed); err != nil {
		log.Printf("DeepSeek parse error: %v (raw: %s)", err, response)
		return loop.fallbackSignal(quantSignal, newsSentiment)
	}

	direction := model.DirectionLong
	if parsed.Direction != "long" {
		direction = model.DirectionShort // treat "neutral" as short/hold
	}

	strength := clamp(parsed.Strength, 0, 1)
	if direction == model.DirectionShort {
		strength = -strength
	}

	return &model.Signal{
		Source:    model.SignalSourceAI,
		Direction: direction,
		Strength:  strength,
		Metadata:  parsed.Reasoning,
	}
}

func (loop *Loop) fallbackSignal(quantSignal *model.Signal, newsSentiment float64) *model.Signal {
	adjusted := clamp(quantSignal.Strength*0.5+newsSentiment*0.2, -1, 1)
	return &model.Signal{
		Source:    model.SignalSourceAI,
		Direction: quantSignal.Direction,
		Strength:  adjusted,
		Metadata:  "AI unavailable — quant+sentiment fallback",
	}
}

// resolveSignal uses the AI signal as primary. Quant acts as a veto if they strongly disagree.
func (loop *Loop) resolveSignal(quantSignal, aiSignal *model.Signal) CombinedSignal {
	aiDir := aiSignal.Direction
	qDir := quantSignal.Direction

	finalStrength := aiSignal.Strength

	// Veto: if quant is strong and strongly disagrees with AI, dampen confidence
	qAbs := quantSignal.Strength
	if qAbs < 0 {
		qAbs = -qAbs
	}
	if qAbs > 0.7 && aiDir != qDir {
		finalStrength *= 0.6
	}

	// Boost: both layers agree
	if aiDir == qDir {
		finalStrength = clamp(finalStrength+quantSignal.Strength*0.15, -1, 1)
	}

	return CombinedSignal{
		Direction: aiDir,
		Strength:  finalStrength,
		Quant:     quantSignal,
		AI:        aiSignal,
	}
}

// ── Position management ───────────────────────────────────────────────────────

// openPosition executes a buy: allocate from vault → swap USDC→token → save position.
// displayPair = "ETH/USDC", tradeAsset = "ETH" (key in uniswap token map).
func (loop *Loop) openPosition(displayPair, tradeAsset string, signal CombinedSignal, currentPrice float64) (string, error) {
	sizing := loop.riskManager.EvaluateEntry(float64(tradeSizeUSDC)/1e6, signal.Quant)
	if !sizing.Approved {
		return "", fmt.Errorf("risk rejected: %s", sizing.Reason)
	}

	txHash := fmt.Sprintf("sim_%d", time.Now().UnixNano())
	var tokenAmount string

	if loop.uni != nil {
		allocAmount := big.NewInt(tradeSizeUSDC)

		// Step 1: pull USDC from vault
		allocTx, allocErr := loop.uni.Allocate(allocAmount)
		if allocErr != nil {
			log.Printf("[%s] Vault allocate error: %v — recording simulation", displayPair, allocErr)
		} else if waitErr := loop.uni.WaitMined(allocTx); waitErr != nil {
			log.Printf("[%s] Allocate wait error: %v", displayPair, waitErr)
		} else {
			// Step 2: swap USDC → token on Uniswap V3
			tokenReceived, swapTx, err := loop.uni.SwapUSDCToToken(tradeAsset, allocAmount)
			if err != nil {
				log.Printf("[%s] Uniswap swap error: %v", displayPair, err)
				_ = loop.settleVault(allocAmount)
			} else {
				txHash = swapTx
				tokenAmount = tokenReceived.String()
				log.Printf("[%s] Swapped %d USDC → %s %s (tx: %s)", displayPair, tradeSizeUSDC, tokenAmount, tradeAsset, swapTx)
			}
		}
	}

	pos := &model.Position{
		Trader:     loop.agentAddress(),
		Pair:       displayPair,
		Direction:  model.DirectionLong,
		Size:       tokenAmount,
		Leverage:   1, // spot, no leverage
		EntryPrice: fmt.Sprintf("%.2f", currentPrice),
		Margin:     fmt.Sprintf("%d", tradeSizeUSDC), // USDC (6 decimals)
		IsOpen:     true,
		TxHash:     txHash,
	}
	if err := loop.repo.Position.Create(pos); err != nil {
		log.Printf("Save position error: %v", err)
	}

	loop.mu.Lock()
	loop.status.TotalTrades++
	loop.mu.Unlock()

	return txHash, nil
}

func (loop *Loop) manageOpenPositions(displayPair string, currentPrice float64) {
	positions, err := loop.repo.Position.FindAllOpen()
	if err != nil {
		return
	}

	for i := range positions {
		pos := &positions[i]
		if pos.Pair != displayPair {
			continue
		}
		entryPrice := parseFloatString(pos.EntryPrice)
		if entryPrice == 0 {
			continue
		}

		// Spot: always long. PnL = (current - entry) / entry
		pnlPct := (currentPrice - entryPrice) / entryPrice

		if pnlPct >= takeProfitPct || pnlPct <= -stopLossPct {
			log.Printf("[%s] Closing position #%d (pnl=%.2f%%)", displayPair, pos.PositionID, pnlPct*100)
			loop.closePosition(pos, currentPrice)
		}
	}
}

func (loop *Loop) closePosition(pos *model.Position, currentPrice float64) {
	if loop.uni != nil && pos.Size != "" {
		tokenAmount := new(big.Int)
		if _, ok := tokenAmount.SetString(pos.Size, 10); ok && tokenAmount.Sign() > 0 {
			// Derive asset from pair ("ETH/USDC" → "ETH", "WBTC/USDC" → "BTC" for token map)
			asset := strings.Split(pos.Pair, "/")[0]
			swapAsset := asset
			if asset == "WBTC" {
				swapAsset = "BTC"
			}
			usdcReceived, swapTx, err := loop.uni.SwapTokenToUSDC(swapAsset, tokenAmount)
			if err != nil {
				log.Printf("[%s] Close swap error: %v", pos.Pair, err)
			} else {
				if err := loop.settleVault(usdcReceived); err != nil {
					log.Printf("[%s] Vault settle error: %v", pos.Pair, err)
				}
				log.Printf("[%s] Settled %s USDC to vault (tx: %s)", pos.Pair, usdcReceived.String(), swapTx)
			}
		}
	}

	entryPrice := parseFloatString(pos.EntryPrice)
	pnlPct := (currentPrice - entryPrice) / entryPrice * 100

	closedAt := time.Now()
	pos.IsOpen = false
	pos.ExitPrice = fmt.Sprintf("%.2f", currentPrice)
	pos.PnL = fmt.Sprintf("%.4f%%", pnlPct)
	pos.ClosedAt = &closedAt

	if err := loop.repo.Position.Update(pos); err != nil {
		log.Printf("Update position error: %v", err)
	}

	loop.mu.Lock()
	total := loop.status.TotalTrades
	if total > 0 {
		wins := loop.status.WinRate * float64(total)
		if pnlPct > 0 {
			wins++
		}
		loop.status.WinRate = wins / float64(total)
	}
	loop.mu.Unlock()
}

func (loop *Loop) settleVault(amount *big.Int) error {
	if loop.uni == nil {
		return nil
	}
	_, err := loop.uni.Settle(amount)
	return err
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (loop *Loop) saveSignal(signal *model.Signal, metadata string) uint {
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

func (loop *Loop) countOpenPositionsByPair(displayPair string) int {
	positions, err := loop.repo.Position.FindOpenByPair(displayPair)
	if err != nil {
		return 0
	}
	return len(positions)
}

func (loop *Loop) agentAddress() string {
	if loop.uni != nil {
		return loop.uni.Address()
	}
	return "0x0000000000000000000000000000000000000001"
}

func (loop *Loop) buildReasoning(
	macroCtx, priceCtx, newsCtx string, newsSentiment float64,
	funding *market.FundingData,
	indicators *quant.IndicatorResult,
	signal CombinedSignal, action string,
) string {
	fundingStr := "unavailable"
	if funding != nil {
		fundingStr = fmt.Sprintf("%.4f%%(%s)", funding.FundingRate*100, funding.Signal)
	}
	return fmt.Sprintf(
		"action=%s dir=%s confidence=%.2f | tech: rsi=%.1f macd=%.5f ma=%.2f bb=%.2f | macro: %s | sentiment: %.2f | derivatives: funding=%s | news: %s | price: %s",
		action, signal.Direction, signal.Strength,
		indicators.RSI, indicators.MACD, indicators.MA, indicators.Bollinger,
		macroCtx, newsSentiment, fundingStr, newsCtx, priceCtx,
	)
}

func (loop *Loop) broadcastUpdate(currentPrice float64, signal CombinedSignal, action string) {
	if loop.webSocketHub == nil {
		return
	}
	msg, _ := json.Marshal(map[string]interface{}{
		"type":      "tick",
		"price":     currentPrice,
		"direction": signal.Direction,
		"strength":  signal.Strength,
		"action":    action,
		"timestamp": time.Now().Unix(),
	})
	loop.webSocketHub.Broadcast(msg)
}

func (loop *Loop) uploadToStorage(decision *model.Decision, indicators *quant.IndicatorResult, signal CombinedSignal, currentPrice float64) {
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
		"direction":     signal.Direction,
		"strength":      signal.Strength,
		"timestamp":     time.Now().Unix(),
	}

	payloadBytes, _ := json.Marshal(payload)
	meta := fmt.Sprintf("voyagerfi_decision_%d", decision.ID)

	rootHash, err := loop.storage.Upload(payloadBytes, meta)
	if err != nil || rootHash == "" {
		log.Printf("0G Storage upload error: %v", err)
		return
	}

	log.Printf("0G Storage uploaded: root=%s", rootHash)
	decision.StorageRoot = rootHash
	_ = loop.repo.Decision.Update(decision)

	if loop.storageAnchor != nil && loop.chainClient != nil {
		anchorTx, err := loop.storageAnchor.Anchor(rootHash, meta)
		if err != nil {
			log.Printf("StorageAnchor error: %v", err)
		} else {
			log.Printf("StorageAnchor anchored: tx=%s", anchorTx)
		}
	}
}

// ── Utility ───────────────────────────────────────────────────────────────────

func maRelation(price, ma float64) string {
	if price > ma {
		return "above"
	}
	return "below"
}

func maTrend(price, ma float64) string {
	diff := (price - ma) / ma * 100
	if diff > 2 {
		return "strongly bullish"
	} else if diff > 0 {
		return "mildly bullish"
	} else if diff < -2 {
		return "strongly bearish"
	}
	return "mildly bearish"
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func parseFloatString(value string) float64 {
	var result float64
	fmt.Sscanf(value, "%f", &result)
	return result
}
