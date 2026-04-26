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

// ForceTestTrade bypasses signal logic to test on-chain Allocate + Swap execution.
func ForceTestTrade(c *gin.Context) {
	result := agentLoop.ForceTestTrade()
	c.JSON(http.StatusOK, result)
}

// RecoverVault settles all stranded USDC in the agent wallet back to the vault.
func RecoverVault(c *gin.Context) {
	result := agentLoop.RecoverVault()
	c.JSON(http.StatusOK, result)
}
