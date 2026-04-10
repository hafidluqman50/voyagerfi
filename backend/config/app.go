package config

import (
	"log"
	"os"
)

type AppConfig struct {
	Port            string
	DatabaseURL     string
	AgentPrivateKey string
	OGRpcURL        string
	DeepSeekAPIKey  string
	DeepSeekURL     string
	StorageEndpoint string
	PythContract    string

	// Contract addresses
	VaultAddress         string
	PerpetualAddress     string
	AgentRegistryAddress string
	DecisionLogAddress   string
	StorageAnchorAddress string
	TradeExecutorAddress string
}

func LoadConfig() *AppConfig {
	return &AppConfig{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		AgentPrivateKey: getEnv("AGENT_PRIVATE_KEY", ""),
		OGRpcURL:        getEnv("OG_RPC_URL", "https://evmrpc.0g.ai"),
		DeepSeekAPIKey:  getEnv("DEEPSEEK_API_KEY", ""),
		DeepSeekURL:     getEnv("DEEPSEEK_URL", ""),
		StorageEndpoint: getEnv("STORAGE_ENDPOINT", ""),
		PythContract:    getEnv("PYTH_CONTRACT", "0x2880ab155794e7179c9ee2e38200202908c17b43"),

		VaultAddress:         getEnv("VAULT_ADDRESS", ""),
		PerpetualAddress:     getEnv("PERPETUAL_ADDRESS", ""),
		AgentRegistryAddress: getEnv("AGENT_REGISTRY_ADDRESS", ""),
		DecisionLogAddress:   getEnv("DECISION_LOG_ADDRESS", ""),
		StorageAnchorAddress: getEnv("STORAGE_ANCHOR_ADDRESS", ""),
		TradeExecutorAddress: getEnv("TRADE_EXECUTOR_ADDRESS", ""),
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
