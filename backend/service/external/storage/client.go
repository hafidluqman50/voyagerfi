package storage

import "log"

// Client wraps 0G Storage SDK for uploading trade logs and decision data
type Client struct {
	endpoint string
}

func NewClient(endpoint string) *Client {
	return &Client{endpoint: endpoint}
}

// Upload stores data to 0G Storage and returns the storage root hash
func (c *Client) Upload(data []byte, metadata string) (string, error) {
	// TODO: Integrate 0G Storage Go SDK
	// github.com/0gfoundation/0g-storage-client
	log.Printf("0G Storage upload: %s (%d bytes)", metadata, len(data))
	return "", nil
}
