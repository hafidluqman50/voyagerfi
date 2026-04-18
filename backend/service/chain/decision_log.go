package chain

import (
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

type DecisionLogBinding struct {
	client  *Client
	address common.Address
}

func NewDecisionLogBinding(client *Client, address string) *DecisionLogBinding {
	return &DecisionLogBinding{
		client:  client,
		address: common.HexToAddress(address),
	}
}

// LogDecision calls decisionLog.logDecision(bytes32 decisionHash) on-chain
func (d *DecisionLogBinding) LogDecision(decisionHashHex string) (string, error) {
	// Strip "0x" prefix if present
	hashHex := strings.TrimPrefix(decisionHashHex, "0x")
	if len(hashHex) != 64 {
		return "", fmt.Errorf("invalid decision hash length: %d", len(hashHex))
	}

	hashBytes, err := hex.DecodeString(hashHex)
	if err != nil {
		return "", fmt.Errorf("decode decision hash: %w", err)
	}

	var hash32 [32]byte
	copy(hash32[:], hashBytes)

	selector := crypto.Keccak256([]byte("logDecision(bytes32)"))[:4]
	data := append(selector, hash32[:]...)

	txHash, err := d.client.SendTx(d.address, data, nil)
	if err != nil {
		return "", fmt.Errorf("send logDecision tx: %w", err)
	}
	return txHash, nil
}
