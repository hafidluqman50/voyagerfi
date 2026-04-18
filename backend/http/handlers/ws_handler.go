package handlers

import (
	"log"
	"net/http"

	"voyagerfi/service/websocket"

	"github.com/gin-gonic/gin"
	gorillaWebsocket "github.com/gorilla/websocket"
)

var webSocketHub *websocket.Hub

func ConfigureWSHandler(hub *websocket.Hub) {
	webSocketHub = hub
}

var connectionUpgrader = gorillaWebsocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func HandleWebSocket(c *gin.Context) {
	connection, err := connectionUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	webSocketHub.Register(connection)

	go func() {
		defer webSocketHub.Unregister(connection)
		for {
			if _, _, err := connection.ReadMessage(); err != nil {
				break
			}
		}
	}()
}
