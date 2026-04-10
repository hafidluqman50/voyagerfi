package chain

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
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

func (v *VaultBinding) GetBalance(user common.Address) (*big.Int, error) {
	// TODO: Call vault.balanceOf(user)
	return big.NewInt(0), nil
}

func (v *VaultBinding) GetAvailableBalance(user common.Address) (*big.Int, error) {
	// TODO: Call vault.availableBalance(user)
	return big.NewInt(0), nil
}
