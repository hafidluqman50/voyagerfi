package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func SyncNow(c *gin.Context) {
	agentLoop.ForceTick()
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "agent cycle triggered"})
}
