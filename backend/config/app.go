package config

import (
	"log"
	"os"
)

type AppConfig struct {
	Port            string
	DatabaseURL     string
	AgentPrivateKey string

	// 0G Chain (verifiability layer)
	OGRpcURL string

	// 0G Compute (DeepSeek v3 via TEE)
	DeepSeekAPIKey string
	DeepSeekURL    string

	// 0G Storage
	StorageEndpoint   string
	StorageIndexerURL string

	// Pyth Oracle (price feeds)
	PythContract string

	// 0G Chain contract addresses (verifiability)
	DecisionLogAddress   string
	StorageAnchorAddress string

	// Arbitrum — custody vault + execution
	ArbitrumRPCURL  string
	VaultAddress    string
	ArbitrumMainnet bool // true = Arbitrum One, false = Arbitrum Sepolia

	// Mock token overrides (Sepolia only — empty on mainnet)
	WBTCAddress    string
	ARBTokenAddress string
}

func LoadConfig() *AppConfig {
	return &AppConfig{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		AgentPrivateKey: getEnv("AGENT_PRIVATE_KEY", ""),

		OGRpcURL: getEnv("OG_RPC_URL", "https://evmrpc-testnet.0g.ai"), // Galileo testnet default; set https://evmrpc.0g.ai for mainnet

		DeepSeekAPIKey: getEnv("DEEPSEEK_API_KEY", ""),
		DeepSeekURL:    getEnv("DEEPSEEK_URL", ""),

		StorageEndpoint:   getEnv("STORAGE_ENDPOINT", ""),
		StorageIndexerURL: getEnv("STORAGE_INDEXER_URL", "https://indexer-storage-turbo.0g.ai"),

		PythContract: getEnv("PYTH_CONTRACT", "0x2880ab155794e7179c9ee2e38200202908c17b43"),

		DecisionLogAddress:   getEnv("DECISION_LOG_ADDRESS", ""),
		StorageAnchorAddress: getEnv("STORAGE_ANCHOR_ADDRESS", ""),

		ArbitrumRPCURL:   getEnv("ARBITRUM_RPC_URL", "https://sepolia-rollup.arbitrum.io/rpc"),
		VaultAddress:     getEnv("VAULT_ADDRESS", ""),
		ArbitrumMainnet:  getEnvBool("ARBITRUM_MAINNET", false),
		WBTCAddress:      getEnv("WBTC_ADDRESS", ""),
		ARBTokenAddress:  getEnv("ARB_TOKEN_ADDRESS", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	if fallback == "" {
		log.Printf("WARNING: %s not set", key)
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	return v == "true" || v == "1"
}
