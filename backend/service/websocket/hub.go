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

func (h *Hub) Register(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[conn] = true
	log.Printf("WebSocket client connected (%d total)", len(h.clients))
}

func (h *Hub) Unregister(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, conn)
	conn.Close()
	log.Printf("WebSocket client disconnected (%d total)", len(h.clients))
}

func (h *Hub) Broadcast(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for conn := range h.clients {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("WebSocket write error: %v", err)
			go h.Unregister(conn)
		}
	}
}
