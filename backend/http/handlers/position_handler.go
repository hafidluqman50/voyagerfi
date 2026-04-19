package handlers

import (
	"net/http"

	"voyagerfi/repository"

	"github.com/gin-gonic/gin"
)

var positionRepo *repository.PositionRepository

func ConfigurePositionHandler(repo *repository.PositionRepository) {
	positionRepo = repo
}

func GetPositions(c *gin.Context) {
	wallet := c.GetString("wallet")

	positions, err := positionRepo.FindByTrader(wallet)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"positions": positions})
}

func GetOpenPositions(c *gin.Context) {
	wallet := c.GetString("wallet")

	positions, err := positionRepo.FindOpenByTrader(wallet)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"positions": positions})
}

// GetAgentPositions returns all agent positions (public, no auth)
func GetAgentPositions(c *gin.Context) {
	positions, err := positionRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"positions": positions})
}

// GetAgentOpenPositions returns all open agent positions (public, no auth)
func GetAgentOpenPositions(c *gin.Context) {
	positions, err := positionRepo.FindAllOpen()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"positions": positions})
}
