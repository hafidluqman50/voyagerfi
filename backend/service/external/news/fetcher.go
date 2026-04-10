package news

import "log"

type Fetcher struct{}

func NewFetcher() *Fetcher {
	return &Fetcher{}
}

// FetchMacro fetches macro economic / crypto news
func (f *Fetcher) FetchMacro() (string, error) {
	// TODO: Integrate news API (CryptoPanic, NewsAPI, etc.)
	log.Println("Fetching macro news...")
	return "", nil
}

// FetchMicro fetches token-specific news
func (f *Fetcher) FetchMicro(token string) (string, error) {
	// TODO: Integrate token-specific news
	log.Printf("Fetching micro news for %s...", token)
	return "", nil
}
