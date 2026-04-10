package chain

import (
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
)

func (c *Client) SendTx(to common.Address, data []byte, value *big.Int) (string, error) {
	ctx := context.Background()

	nonce, err := c.rpc.PendingNonceAt(ctx, c.address)
	if err != nil {
		return "", fmt.Errorf("get nonce: %w", err)
	}

	gasPrice, err := c.rpc.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("get gas price: %w", err)
	}

	if c.chainID == nil {
		c.chainID, err = c.rpc.ChainID(ctx)
		if err != nil {
			return "", fmt.Errorf("get chain ID: %w", err)
		}
	}

	tx := types.NewTransaction(nonce, to, value, 300000, gasPrice, data)

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(c.chainID), c.privateKey)
	if err != nil {
		return "", fmt.Errorf("sign tx: %w", err)
	}

	if err := c.rpc.SendTransaction(ctx, signedTx); err != nil {
		return "", fmt.Errorf("send tx: %w", err)
	}

	return signedTx.Hash().Hex(), nil
}

func (c *Client) SignMessage(data []byte) ([]byte, error) {
	hash := crypto.Keccak256Hash(data)
	return crypto.Sign(hash.Bytes(), c.privateKey)
}
