package chain

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

type StorageAnchorBinding struct {
	client  *Client
	address common.Address
}

func NewStorageAnchorBinding(client *Client, address string) *StorageAnchorBinding {
	return &StorageAnchorBinding{
		client:  client,
		address: common.HexToAddress(address),
	}
}

// Anchor calls storageAnchor.anchor(bytes32 storageRoot, string metadata) on-chain
func (s *StorageAnchorBinding) Anchor(storageRootHex string, metadata string) (string, error) {
	hashHex := strings.TrimPrefix(storageRootHex, "0x")
	// Pad to 64 chars if needed
	for len(hashHex) < 64 {
		hashHex = "0" + hashHex
	}

	hashBytes, err := hex.DecodeString(hashHex)
	if err != nil {
		return "", fmt.Errorf("decode storage root: %w", err)
	}

	var root32 [32]byte
	copy(root32[:], hashBytes)

	// anchor(bytes32,string) — manual ABI encode
	// selector
	selector := crypto.Keccak256([]byte("anchor(bytes32,string)"))[:4]

	// bytes32 arg (fixed, 32 bytes)
	// string arg (dynamic): offset=64, length, data padded to 32
	metaBytes := []byte(metadata)
	metaLen := len(metaBytes)
	padded := (metaLen + 31) / 32 * 32

	data := make([]byte, 4+32+32+32+padded)
	copy(data[0:4], selector)
	copy(data[4:36], root32[:])
	// offset for string = 64 (0x40)
	data[67] = 0x40
	// string length
	data[68+31] = byte(metaLen)
	// string data
	copy(data[100:], metaBytes)

	txHash, err := s.client.SendTx(s.address, data, nil)
	if err != nil {
		return "", fmt.Errorf("send anchor tx: %w", err)
	}
	return txHash, nil
}
