package routes

import (
	"voyagerfi/http/handlers"
	"voyagerfi/http/middleware"
	"voyagerfi/repository"
	"voyagerfi/service"

	"github.com/gin-gonic/gin"
)

func Setup(repo *repository.Registry, svc *service.Registry) *gin.Engine {
	r := gin.Default()

	// Middleware
	r.Use(middleware.CORS())

	// Configure handlers
	handlers.ConfigureVaultHandler(repo.Vault)
	handlers.ConfigurePositionHandler(repo.Position)
	handlers.ConfigureDashboardHandler(repo.Decision)
	handlers.ConfigureDashboardPositionHandler(repo.Position)
	handlers.ConfigureDecisionHandler(repo.Decision)
	handlers.ConfigureWSHandler(svc.WebSocket)
	handlers.ConfigurePricesHandler(svc.Pyth)
	handlers.ConfigureAgentHandler(svc.AgentLoop)

	// Public routes
	api := r.Group("/api/v1")
	{
		api.GET("/dashboard", handlers.GetDashboard)
		api.GET("/prices", handlers.GetPrices)
		api.GET("/agent/status", handlers.GetAgentStatus)
		api.GET("/ws", handlers.HandleWebSocket)
		api.GET("/decisions", handlers.GetDecisions)
		api.GET("/news", handlers.GetNews)
		api.POST("/sync", handlers.SyncNow)
		api.POST("/admin/force-trade", handlers.ForceTestTrade)
		api.POST("/admin/recover", handlers.RecoverVault)
		api.POST("/admin/clear-positions", handlers.ClearPositions)
		api.GET("/agent/positions", handlers.GetAgentPositions)
		api.GET("/agent/positions/open", handlers.GetAgentOpenPositions)
	}

	// Authenticated routes (wallet-based)
	auth := api.Group("")
	auth.Use(middleware.WalletAuth())
	{
		auth.GET("/vault/history", handlers.GetVaultHistory)
		auth.POST("/vault/events", handlers.RecordVaultEvent)
		auth.GET("/positions", handlers.GetPositions)
		auth.GET("/positions/open", handlers.GetOpenPositions)
	}

	return r
}
