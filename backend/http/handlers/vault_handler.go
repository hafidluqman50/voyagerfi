package handlers

import (
	"net/http"

	"voyagerfi/model"
	"voyagerfi/repository"

	"github.com/gin-gonic/gin"
)

var vaultRepo *repository.VaultRepository

func ConfigureVaultHandler(repo *repository.VaultRepository) {
	vaultRepo = repo
}

func GetVaultHistory(c *gin.Context) {
	wallet := c.GetString("wallet")

	events, err := vaultRepo.FindByUser(wallet)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

type recordVaultEventRequest struct {
	EventType string `json:"event_type" binding:"required"`
	Amount    string `json:"amount"     binding:"required"`
	TxHash    string `json:"tx_hash"    binding:"required"`
}

func RecordVaultEvent(c *gin.Context) {
	wallet := c.GetString("wallet")

	var req recordVaultEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.EventType != "deposit" && req.EventType != "withdraw" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_type must be deposit or withdraw"})
		return
	}

	event := &model.VaultEvent{
		User:      wallet,
		EventType: req.EventType,
		Amount:    req.Amount,
		TxHash:    req.TxHash,
	}
	if err := vaultRepo.Create(event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"ok": true})
}
