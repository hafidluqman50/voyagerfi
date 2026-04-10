package middleware

import (
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
)

// WalletAuth verifies the wallet address from the Authorization header
func WalletAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization"})
			return
		}

		address := strings.TrimPrefix(auth, "Bearer ")
		if !common.IsHexAddress(address) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid wallet address"})
			return
		}

		c.Set("wallet", common.HexToAddress(address).Hex())
		c.Next()
	}
}
