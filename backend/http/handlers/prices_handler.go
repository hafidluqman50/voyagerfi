package handlers

import (
	"net/http"
	"sync"
	"time"

	"voyagerfi/service/external/pyth"

	"github.com/gin-gonic/gin"
)

var pythClient *pyth.Client

func ConfigurePricesHandler(client *pyth.Client) {
	pythClient = client
}

// priceCache avoids hammering Pyth on every request
type cachedPrice struct {
	data      gin.H
	fetchedAt time.Time
}

var (
	priceCacheMu sync.Mutex
	priceCache   *cachedPrice
	cacheTTL     = 10 * time.Second
)

// GetPrices returns latest ETH and BTC prices from Pyth Hermes
func GetPrices(c *gin.Context) {
	priceCacheMu.Lock()
	defer priceCacheMu.Unlock()

	if priceCache != nil && time.Since(priceCache.fetchedAt) < cacheTTL {
		c.JSON(http.StatusOK, priceCache.data)
		return
	}

	ethData, ethErr := pythClient.GetETHPrice()
	btcData, btcErr := pythClient.GetBTCPrice()

	result := gin.H{}

	if ethErr == nil {
		result["eth"] = gin.H{
			"price":     ethData.Price,
			"timestamp": ethData.Timestamp,
		}
	} else {
		result["eth"] = gin.H{"price": 0, "error": ethErr.Error()}
	}

	if btcErr == nil {
		result["btc"] = gin.H{
			"price":     btcData.Price,
			"timestamp": btcData.Timestamp,
		}
	} else {
		result["btc"] = gin.H{"price": 0, "error": btcErr.Error()}
	}

	priceCache = &cachedPrice{data: result, fetchedAt: time.Now()}
	c.JSON(http.StatusOK, result)
}
