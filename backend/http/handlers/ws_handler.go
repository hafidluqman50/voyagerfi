package handlers

import (
	"log"
	"net/http"

	"voyagerfi/service/websocket"

	"github.com/gin-gonic/gin"
	ws "github.com/gorilla/websocket"
)

var wsHub *websocket.Hub

func ConfigureWSHandler(hub *websocket.Hub) {
	wsHub = hub
}

var upgrader = ws.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	wsHub.Register(conn)

	go func() {
		defer wsHub.Unregister(conn)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}()
}
