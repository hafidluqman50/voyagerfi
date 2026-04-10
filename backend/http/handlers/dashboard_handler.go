package handlers

import (
	"net/http"

	"voyagerfi/repository"

	"github.com/gin-gonic/gin"
)

var decisionRepo *repository.DecisionRepository

func ConfigureDashboardHandler(repo *repository.DecisionRepository) {
	decisionRepo = repo
}

func GetDashboard(c *gin.Context) {
	decisions, err := decisionRepo.FindLatest(20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recent_decisions": decisions,
	})
}
