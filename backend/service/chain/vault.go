package chain

import (
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

type VaultBinding struct {
	client  *Client
	address common.Address
}

func NewVaultBinding(client *Client, address string) *VaultBinding {
	return &VaultBinding{
		client:  client,
		address: common.HexToAddress(address),
	}
}

func (v *VaultBinding) callContract(data []byte) ([]byte, error) {
	return v.client.rpc.CallContract(context.Background(), ethereum.CallMsg{
		To:   &v.address,
		Data: data,
	}, nil)
}

// GetPoolAvailable calls vault.poolAvailable() — USDC.e available for trading
func (v *VaultBinding) GetPoolAvailable() (*big.Int, error) {
	selector := crypto.Keccak256([]byte("poolAvailable()"))[:4]
	result, err := v.callContract(selector)
	if err != nil {
		return nil, fmt.Errorf("poolAvailable call: %w", err)
	}
	if len(result) == 0 {
		return big.NewInt(0), nil
	}
	return new(big.Int).SetBytes(result), nil
}

// GetPoolBalance calls vault.poolBalance() — total pool value
func (v *VaultBinding) GetPoolBalance() (*big.Int, error) {
	selector := crypto.Keccak256([]byte("poolBalance()"))[:4]
	result, err := v.callContract(selector)
	if err != nil {
		return nil, fmt.Errorf("poolBalance call: %w", err)
	}
	if len(result) == 0 {
		return big.NewInt(0), nil
	}
	return new(big.Int).SetBytes(result), nil
}

// GetUserValue calls vault.userValue(user) — user's proportional USDC.e value
func (v *VaultBinding) GetUserValue(user common.Address) (*big.Int, error) {
	selector := crypto.Keccak256([]byte("userValue(address)"))[:4]
	arg := common.LeftPadBytes(user.Bytes(), 32)
	data := append(selector, arg...)
	result, err := v.callContract(data)
	if err != nil {
		return nil, fmt.Errorf("userValue call: %w", err)
	}
	if len(result) == 0 {
		return big.NewInt(0), nil
	}
	return new(big.Int).SetBytes(result), nil
}
