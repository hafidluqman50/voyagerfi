package storage

// AnchorToChain submits the storage root hash to StorageAnchor contract on-chain
// This creates an on-chain proof that the off-chain data exists in 0G Storage
func (c *Client) AnchorToChain(storageRoot string, metadata string) (string, error) {
	// TODO: Call StorageAnchor.sol anchor(storageRoot, metadata) via chain service
	return "", nil
}
