package websocket

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]bool
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*websocket.Conn]bool),
	}
}

func (hub *Hub) Register(connection *websocket.Conn) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	hub.clients[connection] = true
	log.Printf("WebSocket client connected (%d total)", len(hub.clients))
}

func (hub *Hub) Unregister(connection *websocket.Conn) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	delete(hub.clients, connection)
	connection.Close()
	log.Printf("WebSocket client disconnected (%d total)", len(hub.clients))
}

func (hub *Hub) Broadcast(message []byte) {
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	for connection := range hub.clients {
		if err := connection.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("WebSocket write error: %v", err)
			go hub.Unregister(connection)
		}
	}
}
