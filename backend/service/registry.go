package service

import (
	"log"
	"time"

	"voyagerfi/config"
	"voyagerfi/repository"
	"voyagerfi/service/agent"
	"voyagerfi/service/chain"
	"voyagerfi/service/external/deepseek"
	"voyagerfi/service/external/market"
	"voyagerfi/service/external/news"
	"voyagerfi/service/external/pyth"
	"voyagerfi/service/external/storage"
	"voyagerfi/service/external/uniswap"
	"voyagerfi/service/quant"
	"voyagerfi/service/websocket"
)

type Registry struct {
	Quant     *quant.Engine
	DeepSeek  *deepseek.Client
	Pyth      *pyth.Client
	News      *news.Fetcher
	Market    *market.Fetcher
	Storage   *storage.Client
	WebSocket *websocket.Hub
	AgentLoop *agent.Loop
}

func NewRegistry(cfg *config.AppConfig, repo *repository.Registry) *Registry {
	quantEngine := quant.NewEngine()
	deepseekClient := deepseek.NewClient(cfg.DeepSeekURL, cfg.DeepSeekAPIKey)
	pythClient := pyth.NewClient(cfg.PythContract)
	newsFetcher := news.NewFetcher()
	marketFetcher := market.NewFetcher()
	wsHub := websocket.NewHub()
	riskManager := agent.NewRiskManager(agent.DefaultRiskConfig())

	// 0G Storage
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
		marketFetcher,
		riskManager,
		5*time.Minute,
	)

	agentLoop.SetWSHub(wsHub)
	agentLoop.SetStorage(storageClient)

	// ── Uniswap V3 execution layer (Arbitrum) ────────────────────────────────
	if cfg.AgentPrivateKey != "" && cfg.VaultAddress != "" && cfg.ArbitrumRPCURL != "" {
		uniClient, err := uniswap.NewClient(
			cfg.ArbitrumRPCURL,
			cfg.AgentPrivateKey,
			cfg.VaultAddress,
			cfg.ArbitrumMainnet,
			uniswap.TokenOverrides{
				WBTC: cfg.WBTCAddress,
				ARB:  cfg.ARBTokenAddress,
			},
		)
		if err != nil {
			log.Printf("WARNING: Uniswap client init failed: %v — agent will simulate trades", err)
		} else {
			agentLoop.SetUniswap(uniClient)
			net := "Arbitrum Sepolia"
			if cfg.ArbitrumMainnet {
				net = "Arbitrum One"
			}
			log.Printf("Uniswap V3 client initialized (%s, agent=%s)", net, uniClient.Address())
		}
	} else {
		log.Printf("Uniswap not initialized — AGENT_PRIVATE_KEY/VAULT_ADDRESS/ARBITRUM_RPC_URL missing, running in simulation mode")
	}

	// ── 0G Chain verifiability layer ─────────────────────────────────────────
	if cfg.AgentPrivateKey != "" && cfg.DecisionLogAddress != "" {
		chainClient, err := chain.NewClient(cfg.OGRpcURL, cfg.AgentPrivateKey)
		if err != nil {
			log.Printf("WARNING: 0G Chain client init failed: %v", err)
		} else {
			var decisionLog *chain.DecisionLogBinding
			if cfg.DecisionLogAddress != "" {
				decisionLog = chain.NewDecisionLogBinding(chainClient, cfg.DecisionLogAddress)
			}
			var storageAnchor *chain.StorageAnchorBinding
			if cfg.StorageAnchorAddress != "" {
				storageAnchor = chain.NewStorageAnchorBinding(chainClient, cfg.StorageAnchorAddress)
			}
			agentLoop.SetChainBindings(chainClient, decisionLog, storageAnchor)
			log.Printf("0G Chain bindings initialized (decisionLog=%s storageAnchor=%s)",
				cfg.DecisionLogAddress, cfg.StorageAnchorAddress)
		}
	}

	return &Registry{
		Quant:     quantEngine,
		DeepSeek:  deepseekClient,
		Pyth:      pythClient,
		News:      newsFetcher,
		Market:    marketFetcher,
		Storage:   storageClient,
		WebSocket: wsHub,
		AgentLoop: agentLoop,
	}
}
