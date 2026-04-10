package service

import (
	"time"

	"voyagerfi/config"
	"voyagerfi/repository"
	"voyagerfi/service/agent"
	"voyagerfi/service/external/deepseek"
	"voyagerfi/service/external/news"
	"voyagerfi/service/external/pyth"
	"voyagerfi/service/external/storage"
	"voyagerfi/service/quant"
	"voyagerfi/service/websocket"
)

type Registry struct {
	Quant     *quant.Engine
	DeepSeek  *deepseek.Client
	Pyth      *pyth.Client
	News      *news.Fetcher
	Storage   *storage.Client
	WebSocket *websocket.Hub
	AgentLoop *agent.Loop
}

func NewRegistry(cfg *config.AppConfig, repo *repository.Registry) *Registry {
	quantEngine := quant.NewEngine()
	deepseekClient := deepseek.NewClient(cfg.DeepSeekURL, cfg.DeepSeekAPIKey)
	pythClient := pyth.NewClient(cfg.PythContract)
	newsFetcher := news.NewFetcher()
	storageClient := storage.NewClient(cfg.StorageEndpoint)
	wsHub := websocket.NewHub()
	riskManager := agent.NewRiskManager(agent.DefaultRiskConfig())

	agentLoop := agent.NewLoop(
		repo,
		quantEngine,
		deepseekClient,
		pythClient,
		newsFetcher,
		riskManager,
		30*time.Second,
	)

	_ = storageClient // will be used in agent loop

	return &Registry{
		Quant:     quantEngine,
		DeepSeek:  deepseekClient,
		Pyth:      pythClient,
		News:      newsFetcher,
		Storage:   storageClient,
		WebSocket: wsHub,
		AgentLoop: agentLoop,
	}
}
