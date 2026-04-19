package main

import (
	"log"

	"github.com/joho/godotenv"
	"voyagerfi/config"
	appConfig "voyagerfi/config"
	"voyagerfi/http/routes"
	"voyagerfi/model"
	"voyagerfi/repository"
	"voyagerfi/service"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := appConfig.LoadConfig()

	// Database
	db := config.InitDatabase(cfg.DatabaseURL)
	db.AutoMigrate(
		&model.Position{},
		&model.VaultEvent{},
		&model.Signal{},
		&model.Decision{},
		&model.TradeLog{},
	)

	// Repositories
	repo := repository.NewRegistry(db)

	// Services
	svc := service.NewRegistry(cfg, repo)

	// Start agent loop
	go svc.AgentLoop.Start()

	// HTTP server
	r := routes.Setup(repo, svc)

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
