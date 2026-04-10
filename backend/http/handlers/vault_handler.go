package handlers

import (
	"net/http"

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
