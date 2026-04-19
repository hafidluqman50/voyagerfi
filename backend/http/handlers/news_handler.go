package handlers

import (
	"encoding/xml"
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

type rssFeed struct {
	Channel struct {
		Items []struct {
			Title   string `xml:"title"`
			Link    string `xml:"link"`
			PubDate string `xml:"pubDate"`
			Desc    string `xml:"description"`
		} `xml:"item"`
	} `xml:"channel"`
}

var rssSources = []struct {
	URL    string
	Source string
}{
	{"https://cointelegraph.com/rss", "CoinTelegraph"},
	{"https://coindesk.com/arc/outboundfeeds/rss/", "CoinDesk"},
}

func GetNews(c *gin.Context) {
	if time.Now().Before(newsCacheExpiry) && len(newsCache) > 0 {
		c.JSON(http.StatusOK, gin.H{"news": newsCache})
		return
	}

	articles := fetchRSSNews()
	if len(articles) == 0 && len(newsCache) > 0 {
		c.JSON(http.StatusOK, gin.H{"news": newsCache})
		return
	}

	newsCache = articles
	newsCacheExpiry = time.Now().Add(10 * time.Minute)
	c.JSON(http.StatusOK, gin.H{"news": articles})
}

func fetchRSSNews() []newsArticle {
	var all []newsArticle

	for _, src := range rssSources {
		resp, err := newsHttpClient.Get(src.URL)
		if err != nil {
			log.Printf("RSS fetch error (%s): %v", src.Source, err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			continue
		}

		var feed rssFeed
		if err := xml.Unmarshal(body, &feed); err != nil {
			log.Printf("RSS parse error (%s): %v", src.Source, err)
			continue
		}

		for i, item := range feed.Channel.Items {
			if i >= 4 {
				break
			}
			all = append(all, newsArticle{
				Title:       item.Title,
				Description: item.Desc,
				URL:         item.Link,
				Source:      src.Source,
				PublishedAt: item.PubDate,
				Sentiment:   "neutral",
			})
		}
	}

	return all
}
