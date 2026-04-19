package chain

import (
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

const priceFeedABIJSON = `[
	{
		"name": "setPrice",
		"type": "function",
		"inputs": [
			{"name": "_price", "type": "uint256"}
		],
		"outputs": [],
		"stateMutability": "nonpayable"
	}
]`

type PriceFeedBinding struct {
	client  *Client
	address common.Address
	abi     abi.ABI
}

func NewPriceFeedBinding(client *Client, address string) (*PriceFeedBinding, error) {
	parsedABI, err := abi.JSON(strings.NewReader(priceFeedABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse pricefeed ABI: %w", err)
	}
	return &PriceFeedBinding{
		client:  client,
		address: common.HexToAddress(address),
		abi:     parsedABI,
	}, nil
}

// SetPrice pushes the latest price (in USD with 8 decimals, e.g. 3000_00000000) on-chain.
func (p *PriceFeedBinding) SetPrice(priceUSD float64) (string, error) {
	// Convert to 8-decimal fixed point integer
	priceInt := new(big.Int).SetInt64(int64(priceUSD * 1e8))
	data, err := p.abi.Pack("setPrice", priceInt)
	if err != nil {
		return "", fmt.Errorf("pack setPrice: %w", err)
	}
	txHash, err := p.client.SendTx(p.address, data, nil)
	if err != nil {
		return "", fmt.Errorf("send setPrice tx: %w", err)
	}
	return txHash, nil
}
