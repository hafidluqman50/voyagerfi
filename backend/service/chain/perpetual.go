package chain

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
)

type PerpetualBinding struct {
	client  *Client
	address common.Address
}

func NewPerpetualBinding(client *Client, address string) *PerpetualBinding {
	return &PerpetualBinding{
		client:  client,
		address: common.HexToAddress(address),
	}
}

func (p *PerpetualBinding) OpenPosition(trader common.Address, direction uint8, margin *big.Int, leverage *big.Int) (string, error) {
	// TODO: Build and send tx to perpetual.openPosition(trader, direction, margin, leverage)
	return "", nil
}

func (p *PerpetualBinding) ClosePosition(positionID *big.Int) (string, error) {
	// TODO: Build and send tx to perpetual.closePosition(positionId)
	return "", nil
}
