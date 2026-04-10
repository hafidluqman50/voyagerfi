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
	handlers.ConfigureWSHandler(svc.WebSocket)

	// Public routes
	api := r.Group("/api/v1")
	{
		api.GET("/dashboard", handlers.GetDashboard)
		api.GET("/ws", handlers.HandleWebSocket)
	}

	// Authenticated routes (wallet-based)
	auth := api.Group("")
	auth.Use(middleware.WalletAuth())
	{
		auth.GET("/vault/history", handlers.GetVaultHistory)
		auth.GET("/positions", handlers.GetPositions)
		auth.GET("/positions/open", handlers.GetOpenPositions)
	}

	return r
}
