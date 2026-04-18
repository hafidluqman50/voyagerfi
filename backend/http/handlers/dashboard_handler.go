package handlers

import (
	"net/http"

	"voyagerfi/repository"

	"github.com/gin-gonic/gin"
)

var decisionRepo *repository.DecisionRepository
var positionRepoForDash *repository.PositionRepository

func ConfigureDashboardHandler(repo *repository.DecisionRepository) {
	decisionRepo = repo
}

func ConfigureDashboardPositionHandler(repo *repository.PositionRepository) {
	positionRepoForDash = repo
}

func GetDashboard(c *gin.Context) {
	decisions, err := decisionRepo.FindLatest(20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Recent closed positions for PnL display
	var recentPositions interface{}
	if positionRepoForDash != nil {
		positions, posErr := positionRepoForDash.FindAllOpen()
		if posErr == nil {
			recentPositions = positions
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"recent_decisions": decisions,
		"open_positions":   recentPositions,
	})
}
