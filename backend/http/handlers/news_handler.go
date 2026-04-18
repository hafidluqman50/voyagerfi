package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type newsArticle struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	Source      string `json:"source"`
	PublishedAt string `json:"published_at"`
	Sentiment   string `json:"sentiment"`
}

var (
	newsHttpClient  = &http.Client{Timeout: 8 * time.Second}
	newsCache       []newsArticle
	newsCacheExpiry time.Time
)

func GetNews(c *gin.Context) {
	if time.Now().Before(newsCacheExpiry) && len(newsCache) > 0 {
		c.JSON(http.StatusOK, gin.H{"news": newsCache})
		return
	}

	articles, err := fetchCoinGeckoNews()
	if err != nil {
		log.Printf("News fetch error: %v", err)
		c.JSON(http.StatusOK, gin.H{"news": newsCache}) // return stale on error
		return
	}

	newsCache = articles
	newsCacheExpiry = time.Now().Add(5 * time.Minute)
	c.JSON(http.StatusOK, gin.H{"news": articles})
}

func fetchCoinGeckoNews() ([]newsArticle, error) {
	resp, err := newsHttpClient.Get("https://api.coingecko.com/api/v3/news")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Data []struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			URL         string `json:"url"`
			Author      struct {
				Name string `json:"name"`
			} `json:"author"`
			UpdatedAt int64 `json:"updated_at"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	articles := make([]newsArticle, 0, 8)
	for index, item := range result.Data {
		if index >= 8 {
			break
		}
		source := item.Author.Name
		if source == "" {
			source = "CoinGecko"
		}
		articles = append(articles, newsArticle{
			Title:       item.Title,
			Description: item.Description,
			URL:         item.URL,
			Source:      source,
			PublishedAt: time.Unix(item.UpdatedAt, 0).UTC().Format(time.RFC3339),
			Sentiment:   "neutral",
		})
	}

	return articles, nil
}
