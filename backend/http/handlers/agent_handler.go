package handlers

import (
	"net/http"

	"voyagerfi/service/agent"

	"github.com/gin-gonic/gin"
)

var agentLoop *agent.Loop

func ConfigureAgentHandler(loop *agent.Loop) {
	agentLoop = loop
}

// GetAgentStatus returns the current agent runtime status
func GetAgentStatus(c *gin.Context) {
	status := agentLoop.GetStatus()
	c.JSON(http.StatusOK, status)
}
