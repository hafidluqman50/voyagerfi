package chain

import (
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type Client struct {
	rpc        *ethclient.Client
	privateKey *ecdsa.PrivateKey
	address    common.Address
	chainID    *big.Int
}

func NewClient(rpcURL string, privateKeyHex string) (*Client, error) {
	rpc, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("dial RPC: %w", err)
	}

	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}

	publicKey := privateKey.Public().(*ecdsa.PublicKey)
	address := crypto.PubkeyToAddress(*publicKey)

	log.Printf("Agent wallet: %s", address.Hex())

	return &Client{
		rpc:        rpc,
		privateKey: privateKey,
		address:    address,
	}, nil
}

func (c *Client) Address() common.Address {
	return c.address
}

func (c *Client) RPC() *ethclient.Client {
	return c.rpc
}
