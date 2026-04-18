package handlers

import (
	"net/http"
	"strconv"

	"voyagerfi/repository"

	"github.com/gin-gonic/gin"
)

var decisionListRepo *repository.DecisionRepository

func ConfigureDecisionHandler(repo *repository.DecisionRepository) {
	decisionListRepo = repo
}

func GetDecisions(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 200 {
		limit = 50
	}

	decisions, err := decisionListRepo.FindLatest(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"decisions": decisions})
}
