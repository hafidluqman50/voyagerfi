package chain

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"voyagerfi/model"
	"voyagerfi/repository"
)

const indexerPollInterval = 60 * time.Second

const perpetualIndexerABIJSON = `[
	{
		"name": "PositionOpened",
		"type": "event",
		"inputs": [
			{"name": "positionId", "type": "uint256", "indexed": true},
			{"name": "trader",     "type": "address", "indexed": true},
			{"name": "direction",  "type": "uint8",   "indexed": false},
			{"name": "size",       "type": "uint256",  "indexed": false},
			{"name": "leverage",   "type": "uint256",  "indexed": false},
			{"name": "entryPrice", "type": "uint256",  "indexed": false}
		]
	},
	{
		"name": "PositionClosed",
		"type": "event",
		"inputs": [
			{"name": "positionId",  "type": "uint256", "indexed": true},
			{"name": "exitPrice",   "type": "uint256", "indexed": false},
			{"name": "pnl",         "type": "int256",  "indexed": false}
		]
	}
]`

const vaultIndexerABIJSON = `[
	{
		"name": "Deposited",
		"type": "event",
		"inputs": [
			{"name": "user",   "type": "address", "indexed": true},
			{"name": "amount", "type": "uint256", "indexed": false}
		]
	},
	{
		"name": "Withdrawn",
		"type": "event",
		"inputs": [
			{"name": "user",   "type": "address", "indexed": true},
			{"name": "amount", "type": "uint256", "indexed": false}
		]
	}
]`

type Indexer struct {
	client           *Client
	perpetualAddress common.Address
	vaultAddress     common.Address
	perpetualABI     abi.ABI
	vaultABI         abi.ABI
	repo             *repository.Registry
	lastBlock        uint64
	stopCh           chan struct{}
}

func NewIndexer(client *Client, perpetualAddress, vaultAddress string, repo *repository.Registry) (*Indexer, error) {
	perpABI, err := abi.JSON(strings.NewReader(perpetualIndexerABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse perpetual event ABI: %w", err)
	}
	vaultABI, err := abi.JSON(strings.NewReader(vaultIndexerABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse vault event ABI: %w", err)
	}
	return &Indexer{
		client:           client,
		perpetualAddress: common.HexToAddress(perpetualAddress),
		vaultAddress:     common.HexToAddress(vaultAddress),
		perpetualABI:     perpABI,
		vaultABI:         vaultABI,
		repo:             repo,
		stopCh:           make(chan struct{}),
	}, nil
}

func (idx *Indexer) Start() {
	log.Println("Chain indexer started")
	ticker := time.NewTicker(indexerPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := idx.poll(); err != nil {
				log.Printf("Indexer poll error: %v", err)
			}
		case <-idx.stopCh:
			log.Println("Chain indexer stopped")
			return
		}
	}
}

func (idx *Indexer) Stop() {
	close(idx.stopCh)
}

// SyncNow triggers an immediate index of the latest block — call after tx confirmed.
func (idx *Indexer) SyncNow() error {
	return idx.poll()
}

func (idx *Indexer) poll() error {
	ctx := context.Background()

	latest, err := idx.client.rpc.BlockNumber(ctx)
	if err != nil {
		return fmt.Errorf("get latest block: %w", err)
	}

	if idx.lastBlock == 0 {
		// Start from current block on first run
		idx.lastBlock = latest
		return nil
	}

	if latest <= idx.lastBlock {
		return nil
	}

	from := new(big.Int).SetUint64(idx.lastBlock + 1)
	to := new(big.Int).SetUint64(latest)

	if err := idx.indexPerpetualEvents(ctx, from, to); err != nil {
		log.Printf("Indexer perpetual events error: %v", err)
	}
	if err := idx.indexVaultEvents(ctx, from, to); err != nil {
		log.Printf("Indexer vault events error: %v", err)
	}

	idx.lastBlock = latest
	return nil
}

func (idx *Indexer) indexPerpetualEvents(ctx context.Context, from, to *big.Int) error {
	logs, err := idx.client.rpc.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: from,
		ToBlock:   to,
		Addresses: []common.Address{idx.perpetualAddress},
	})
	if err != nil {
		return fmt.Errorf("filter perpetual logs: %w", err)
	}

	openedID := idx.perpetualABI.Events["PositionOpened"].ID
	closedID := idx.perpetualABI.Events["PositionClosed"].ID

	for _, l := range logs {
		if len(l.Topics) == 0 {
			continue
		}
		switch l.Topics[0] {
		case openedID:
			idx.handlePositionOpened(l)
		case closedID:
			idx.handlePositionClosed(l)
		}
	}
	return nil
}

func (idx *Indexer) indexVaultEvents(ctx context.Context, from, to *big.Int) error {
	logs, err := idx.client.rpc.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: from,
		ToBlock:   to,
		Addresses: []common.Address{idx.vaultAddress},
	})
	if err != nil {
		return fmt.Errorf("filter vault logs: %w", err)
	}

	depositedID := idx.vaultABI.Events["Deposited"].ID
	withdrawnID := idx.vaultABI.Events["Withdrawn"].ID

	for _, l := range logs {
		if len(l.Topics) == 0 {
			continue
		}
		switch l.Topics[0] {
		case depositedID:
			idx.handleDeposited(l)
		case withdrawnID:
			idx.handleWithdrawn(l)
		}
	}
	return nil
}

func (idx *Indexer) handlePositionOpened(l types.Log) {
	var event struct {
		Direction  uint8
		Size       *big.Int
		Leverage   *big.Int
		EntryPrice *big.Int
	}
	if err := idx.perpetualABI.UnpackIntoInterface(&event, "PositionOpened", l.Data); err != nil {
		log.Printf("Unpack PositionOpened error: %v", err)
		return
	}

	positionID := new(big.Int).SetBytes(l.Topics[1].Bytes()).Uint64()
	trader := common.HexToAddress(l.Topics[2].Hex()).Hex()

	direction := model.DirectionLong
	if event.Direction == 1 {
		direction = model.DirectionShort
	}

	pos := &model.Position{
		PositionID: uint(positionID),
		Trader:     trader,
		Direction:  direction,
		Size:       weiToEtherStr(event.Size),
		Leverage:   uint(event.Leverage.Uint64()),
		EntryPrice: usdPriceStr(event.EntryPrice),
		IsOpen:     true,
		TxHash:     l.TxHash.Hex(),
	}

	// Upsert — skip if already indexed by agent loop
	var existing model.Position
	if err := idx.repo.Position.DB().Where("position_id = ?", positionID).First(&existing).Error; err == nil {
		return
	}
	if err := idx.repo.Position.Create(pos); err != nil {
		log.Printf("Indexer save PositionOpened error: %v", err)
	} else {
		log.Printf("Indexed PositionOpened #%d trader=%s", positionID, trader)
	}
}

func (idx *Indexer) handlePositionClosed(l types.Log) {
	var event struct {
		ExitPrice *big.Int
		Pnl       *big.Int
	}
	if err := idx.perpetualABI.UnpackIntoInterface(&event, "PositionClosed", l.Data); err != nil {
		log.Printf("Unpack PositionClosed error: %v", err)
		return
	}

	positionID := uint(new(big.Int).SetBytes(l.Topics[1].Bytes()).Uint64())

	var pos model.Position
	if err := idx.repo.Position.DB().Where("position_id = ?", positionID).First(&pos).Error; err != nil {
		log.Printf("Indexer PositionClosed: position #%d not found in DB", positionID)
		return
	}

	now := time.Now()
	pos.IsOpen = false
	pos.ExitPrice = usdPriceStr(event.ExitPrice)
	pos.PnL = pnlStr(event.Pnl)
	pos.ClosedAt = &now
	pos.TxHash = l.TxHash.Hex()

	if err := idx.repo.Position.Update(&pos); err != nil {
		log.Printf("Indexer update PositionClosed error: %v", err)
	} else {
		log.Printf("Indexed PositionClosed #%d exitPrice=%s", positionID, pos.ExitPrice)
	}
}

func (idx *Indexer) handleDeposited(l types.Log) {
	var event struct{ Amount *big.Int }
	if err := idx.vaultABI.UnpackIntoInterface(&event, "Deposited", l.Data); err != nil {
		log.Printf("Unpack Deposited error: %v", err)
		return
	}
	user := common.HexToAddress(l.Topics[1].Hex()).Hex()
	vaultEvent := &model.VaultEvent{
		User:      user,
		EventType: "deposit",
		Amount:    weiToEtherStr(event.Amount),
		TxHash:    l.TxHash.Hex(),
	}
	if err := idx.repo.Vault.Create(vaultEvent); err != nil {
		log.Printf("Indexer save Deposited error: %v", err)
	} else {
		log.Printf("Indexed Deposit user=%s amount=%s", user, vaultEvent.Amount)
	}
}

func (idx *Indexer) handleWithdrawn(l types.Log) {
	var event struct{ Amount *big.Int }
	if err := idx.vaultABI.UnpackIntoInterface(&event, "Withdrawn", l.Data); err != nil {
		log.Printf("Unpack Withdrawn error: %v", err)
		return
	}
	user := common.HexToAddress(l.Topics[1].Hex()).Hex()
	vaultEvent := &model.VaultEvent{
		User:      user,
		EventType: "withdraw",
		Amount:    weiToEtherStr(event.Amount),
		TxHash:    l.TxHash.Hex(),
	}
	if err := idx.repo.Vault.Create(vaultEvent); err != nil {
		log.Printf("Indexer save Withdrawn error: %v", err)
	} else {
		log.Printf("Indexed Withdraw user=%s amount=%s", user, vaultEvent.Amount)
	}
}

func weiToEtherStr(wei *big.Int) string {
	f, _ := new(big.Float).Quo(new(big.Float).SetInt(wei), big.NewFloat(1e18)).Float64()
	return fmt.Sprintf("%.6f", f)
}

func usdPriceStr(price *big.Int) string {
	// Price stored with 8 decimals (from setPrice)
	f, _ := new(big.Float).Quo(new(big.Float).SetInt(price), big.NewFloat(1e8)).Float64()
	return fmt.Sprintf("%.2f", f)
}

func pnlStr(pnl *big.Int) string {
	f, _ := new(big.Float).SetInt(pnl).Float64()
	f /= 1e18
	return fmt.Sprintf("%.4f", f)
}
