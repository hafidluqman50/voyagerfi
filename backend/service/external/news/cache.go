package news

import (
	"sync"
	"time"
)

type CachedNews struct {
	Content   string
	FetchedAt time.Time
}

type Cache struct {
	mu    sync.RWMutex
	items map[string]*CachedNews
	ttl   time.Duration
}

func NewCache(ttl time.Duration) *Cache {
	return &Cache{
		items: make(map[string]*CachedNews),
		ttl:   ttl,
	}
}

func (c *Cache) Get(key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, ok := c.items[key]
	if !ok || time.Since(item.FetchedAt) > c.ttl {
		return "", false
	}
	return item.Content, true
}

func (c *Cache) Set(key string, content string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = &CachedNews{
		Content:   content,
		FetchedAt: time.Now(),
	}
}
