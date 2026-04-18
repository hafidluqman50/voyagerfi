package service

import (
	"log"
	"time"

	"voyagerfi/config"
	"voyagerfi/repository"
	"voyagerfi/service/agent"
	"voyagerfi/service/chain"
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
	wsHub := websocket.NewHub()
	riskManager := agent.NewRiskManager(agent.DefaultRiskConfig())

	// 0G Storage client
	storageClient := storage.NewClient(cfg.StorageIndexerURL)
	if cfg.AgentPrivateKey != "" {
		storageClient.SetCredentials(cfg.OGRpcURL, cfg.AgentPrivateKey)
	}

	agentLoop := agent.NewLoop(
		repo,
		quantEngine,
		deepseekClient,
		pythClient,
		newsFetcher,
		riskManager,
		10*time.Second,
	)

	// Wire WebSocket hub + 0G Storage into agent loop
	agentLoop.SetWSHub(wsHub)
	agentLoop.SetStorage(storageClient)

	// Initialize on-chain bindings if private key is configured
	if cfg.AgentPrivateKey != "" {
		chainClient, err := chain.NewClient(cfg.OGRpcURL, cfg.AgentPrivateKey)
		if err != nil {
			log.Printf("WARNING: chain client init failed: %v — running in simulation mode", err)
		} else {
			vaultBinding := chain.NewVaultBinding(chainClient, cfg.VaultAddress)

			perpetualBinding, perpErr := chain.NewPerpetualBinding(chainClient, cfg.PerpetualAddress)
			if perpErr != nil {
				log.Printf("WARNING: perpetual ABI parse failed: %v", perpErr)
			}

			var decisionLogBinding *chain.DecisionLogBinding
			if cfg.DecisionLogAddress != "" {
				decisionLogBinding = chain.NewDecisionLogBinding(chainClient, cfg.DecisionLogAddress)
			}

			var storageAnchorBinding *chain.StorageAnchorBinding
			if cfg.StorageAnchorAddress != "" {
				storageAnchorBinding = chain.NewStorageAnchorBinding(chainClient, cfg.StorageAnchorAddress)
			}

			if perpetualBinding != nil {
				agentLoop.SetChainBindings(
					chainClient, vaultBinding, perpetualBinding,
					decisionLogBinding, storageAnchorBinding,
				)
				log.Printf("Chain bindings initialized (vault=%s perpetual=%s storage_anchor=%s)",
					cfg.VaultAddress, cfg.PerpetualAddress, cfg.StorageAnchorAddress)
			}
		}
	} else {
		log.Printf("AGENT_PRIVATE_KEY not set — running agent in simulation mode")
	}

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
