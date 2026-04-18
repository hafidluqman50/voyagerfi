package chain

import (
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

const perpetualABIJSON = `[
	{
		"name": "openPosition",
		"type": "function",
		"inputs": [
			{"name": "trader",    "type": "address"},
			{"name": "direction", "type": "uint8"},
			{"name": "margin",    "type": "uint256"},
			{"name": "leverage",  "type": "uint256"}
		],
		"outputs": [],
		"stateMutability": "nonpayable"
	},
	{
		"name": "closePosition",
		"type": "function",
		"inputs": [
			{"name": "positionId", "type": "uint256"}
		],
		"outputs": [],
		"stateMutability": "nonpayable"
	}
]`

type PerpetualBinding struct {
	client  *Client
	address common.Address
	abi     abi.ABI
}

func NewPerpetualBinding(client *Client, address string) (*PerpetualBinding, error) {
	parsedABI, err := abi.JSON(strings.NewReader(perpetualABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse perpetual ABI: %w", err)
	}
	return &PerpetualBinding{
		client:  client,
		address: common.HexToAddress(address),
		abi:     parsedABI,
	}, nil
}

// DirectionLong and DirectionShort match the Solidity Direction enum
const (
	DirectionLong  uint8 = 0
	DirectionShort uint8 = 1
)

// OpenPosition sends openPosition(trader, direction, margin, leverage) tx
func (p *PerpetualBinding) OpenPosition(trader common.Address, direction uint8, margin *big.Int, leverage *big.Int) (string, error) {
	data, err := p.abi.Pack("openPosition", trader, direction, margin, leverage)
	if err != nil {
		return "", fmt.Errorf("pack openPosition: %w", err)
	}
	txHash, err := p.client.SendTx(p.address, data, nil)
	if err != nil {
		return "", fmt.Errorf("send openPosition tx: %w", err)
	}
	return txHash, nil
}

// ClosePosition sends closePosition(positionId) tx
func (p *PerpetualBinding) ClosePosition(positionID *big.Int) (string, error) {
	data, err := p.abi.Pack("closePosition", positionID)
	if err != nil {
		return "", fmt.Errorf("pack closePosition: %w", err)
	}
	txHash, err := p.client.SendTx(p.address, data, nil)
	if err != nil {
		return "", fmt.Errorf("send closePosition tx: %w", err)
	}
	return txHash, nil
}
