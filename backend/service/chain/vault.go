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

// GetBalance calls vault.balanceOf(user) — returns raw wei balance
func (v *VaultBinding) GetBalance(user common.Address) (*big.Int, error) {
	selector := crypto.Keccak256([]byte("balanceOf(address)"))[:4]
	arg := common.LeftPadBytes(user.Bytes(), 32)
	data := append(selector, arg...)

	result, err := v.callContract(data)
	if err != nil {
		return nil, fmt.Errorf("balanceOf call: %w", err)
	}
	if len(result) == 0 {
		return big.NewInt(0), nil
	}
	return new(big.Int).SetBytes(result), nil
}

// GetAvailableBalance calls vault.availableBalance(user) — balance minus locked margin
func (v *VaultBinding) GetAvailableBalance(user common.Address) (*big.Int, error) {
	selector := crypto.Keccak256([]byte("availableBalance(address)"))[:4]
	arg := common.LeftPadBytes(user.Bytes(), 32)
	data := append(selector, arg...)

	result, err := v.callContract(data)
	if err != nil {
		return nil, fmt.Errorf("availableBalance call: %w", err)
	}
	if len(result) == 0 {
		return big.NewInt(0), nil
	}
	return new(big.Int).SetBytes(result), nil
}
