package handlers

import (
	"net/http"

	"voyagerfi/service/chain"

	"github.com/gin-gonic/gin"
)

var indexer *chain.Indexer

func ConfigureSyncHandler(i *chain.Indexer) {
	indexer = i
}

func SyncNow(c *gin.Context) {
	if indexer == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "indexer not available (simulation mode)"})
		return
	}
	if err := indexer.SyncNow(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
