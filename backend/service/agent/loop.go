package agent

import (
	"log"
	"time"

	"voyagerfi/repository"
	"voyagerfi/service/external/deepseek"
	"voyagerfi/service/external/news"
	"voyagerfi/service/external/pyth"
	"voyagerfi/service/quant"
)

type Loop struct {
	repo        *repository.Registry
	quant       *quant.Engine
	deepseek    *deepseek.Client
	pyth        *pyth.Client
	news        *news.Fetcher
	riskManager *RiskManager
	interval    time.Duration
	stopCh      chan struct{}
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
	return &Loop{
		repo:        repo,
		quant:       quantEngine,
		deepseek:    deepseekClient,
		pyth:        pythClient,
		news:        newsFetcher,
		riskManager: riskManager,
		interval:    interval,
		stopCh:      make(chan struct{}),
	}
}

func (l *Loop) Start() {
	log.Printf("Agent loop started (interval: %s)", l.interval)
	ticker := time.NewTicker(l.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			l.tick()
		case <-l.stopCh:
			log.Println("Agent loop stopped")
			return
		}
	}
}

func (l *Loop) Stop() {
	close(l.stopCh)
}

func (l *Loop) tick() {
	log.Println("Agent tick: Observe → Think → Act")

	// 1. OBSERVE: Fetch price data + news
	// TODO: Collect OHLCV from pyth, fetch news
	_ = l.pyth
	_ = l.news

	// 2. THINK: Run quant analysis + AI reasoning
	// TODO: quant.Analyze(prices) + deepseek.Chat(prompt)
	_ = l.quant
	_ = l.deepseek

	// 3. ACT: Combine signals → risk check → execute trade
	// TODO: CombineSignals → RiskManager.EvaluateEntry → chain.OpenPosition
	_ = l.riskManager

	// 4. LOG: Hash decision → on-chain DecisionLog → 0G Storage → StorageAnchor
	// TODO: Full verifiable trade log pipeline

	log.Println("Agent tick completed")
}
