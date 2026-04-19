package storage

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/0gfoundation/0g-storage-client/common/blockchain"
	"github.com/0gfoundation/0g-storage-client/core"
	"github.com/0gfoundation/0g-storage-client/indexer"
	"github.com/0gfoundation/0g-storage-client/transfer"
)

// Client wraps 0G Storage SDK for uploading trade logs
type Client struct {
	evmRPC     string
	privateKey string
	indexerURL string
}

func NewClient(endpoint string) *Client {
	return &Client{indexerURL: endpoint}
}

// SetCredentials configures the wallet for signing storage transactions
func (c *Client) SetCredentials(evmRPC, privateKey string) {
	c.evmRPC = evmRPC
	c.privateKey = privateKey
}

// Upload stores data to 0G Storage and returns the Merkle root hash
func (c *Client) Upload(data []byte, metadata string) (string, error) {
	if c.privateKey == "" || c.indexerURL == "" {
		return "", nil
	}

	// Write data to a temp file (SDK requires file path)
	tmpFile, err := os.CreateTemp("", "voyagerfi-*.json")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		return "", fmt.Errorf("write temp file: %w", err)
	}
	tmpFile.Close()

	// Calculate Merkle root hash
	rootHash, err := core.MerkleRoot(tmpFile.Name())
	if err != nil {
		return "", fmt.Errorf("merkle root: %w", err)
	}

	// Initialize blockchain client
	w3client := blockchain.MustNewWeb3(c.evmRPC, c.privateKey)
	defer w3client.Close()

	// Initialize indexer client
	indexerClient, err := indexer.NewClient(c.indexerURL, indexer.IndexerClientOption{})
	if err != nil {
		return "", fmt.Errorf("indexer client: %w", err)
	}

	// Open file for upload
	file, err := core.Open(tmpFile.Name())
	if err != nil {
		return "", fmt.Errorf("open file: %w", err)
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	opt := transfer.UploadOption{
		ExpectedReplica: 1,
		TaskSize:        10,
		SkipTx:          false,
		FastMode:        true,
		Method:          "min",
		FullTrusted:     true,
	}

	_, _, err = indexerClient.SplitableUpload(ctx, w3client, file, 4*1024*1024*1024, opt)
	if err != nil {
		return "", fmt.Errorf("upload: %w", err)
	}

	log.Printf("0G Storage upload success: %s root=%s", metadata, rootHash.String())
	return rootHash.String(), nil
}
