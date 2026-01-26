# Deployment Guide

Step-by-step guide for deploying the Fuul Solana program to a new network.

## Prerequisites

- Solana CLI installed (`solana --version`)
- Anchor CLI installed (`anchor --version`)
- Sufficient SOL for deployment (~5-7 SOL recommended)

## Step 1: Set Network

```bash
# Options: localhost, devnet, mainnet
export NETWORK="devnet"
```

## Step 2: Create Keypairs

```bash
# Create network-specific folder
mkdir -p ./keys/$NETWORK

# Create program keypair (shared across networks, only if new deployment)
solana-keygen new --outfile ./keys/program.json --no-bip39-passphrase

# Create network-specific keypairs
solana-keygen new --outfile ./keys/$NETWORK/admin.json --no-bip39-passphrase
solana-keygen new --outfile ./keys/$NETWORK/signer.json --no-bip39-passphrase
solana-keygen new --outfile ./keys/$NETWORK/fee-collector.json --no-bip39-passphrase

# Export environment variables
export ADMIN_KEYPAIR="./keys/$NETWORK/admin.json"
export SIGNER_KEYPAIR="./keys/$NETWORK/signer.json"
export FEE_COLLECTOR_KEYPAIR="./keys/$NETWORK/fee-collector.json"

export ADMIN_ACC=$(solana-keygen pubkey $ADMIN_KEYPAIR)
export SIGNER_ACC=$(solana-keygen pubkey $SIGNER_KEYPAIR)
export FEE_COLLECTOR_ACC=$(solana-keygen pubkey $FEE_COLLECTOR_KEYPAIR)

# Display addresses
echo "Admin: $ADMIN_ACC"
echo "Signer: $SIGNER_ACC"
echo "Fee Collector: $FEE_COLLECTOR_ACC"
```

## Step 3: Fund Admin Wallet

```bash
# Check balance
solana balance --keypair $ADMIN_KEYPAIR --url $NETWORK

# For devnet/testnet, use airdrop (may be rate limited)
solana airdrop 2 --url $NETWORK --keypair $ADMIN_KEYPAIR

# For mainnet, transfer SOL manually to the admin address
echo "Fund this address: $ADMIN_ACC"
```

**Required:** ~5-7 SOL for initial deployment, ~4-5 SOL for upgrades.

## Step 4: Build and Sync Keys

```bash
# Initial build
anchor build

# Copy program keypair to target
cp ./keys/program.json ./target/deploy/fuul_solana-keypair.json

# Sync keys (updates program ID in lib.rs and Anchor.toml)
anchor keys sync --program-name fuul_solana --provider.cluster $NETWORK --provider.wallet $ADMIN_KEYPAIR

# Rebuild with new program ID
anchor build

# Get the new program ID
export PROGRAM_ID=$(solana-keygen pubkey ./keys/program.json)
echo "Program ID: $PROGRAM_ID"
```

## Step 5: Compute and Update PDAs

```bash
# Compute PDAs for the new program ID
yarn scripts compute-pdas --network $NETWORK --program-id $PROGRAM_ID
```

This will output something like:
```
GLOBAL CONFIG PDA: BvaeXyfbPf5hxcKLuwXvLfhjSCVmXtHhH1YSJmW46GvV
GLOBAL CONFIG BUMP: 253
```

**Update the constants files with these values:**

### Update `programs/fuul-solana/src/constants.rs`

```rust
/// Global config address
pub const GLOBAL_CONFIG_ADDRESS: Pubkey = pubkey!("<NEW_PDA_ADDRESS>");
pub const GLOBAL_CONFIG_BUMP: u8 = <NEW_BUMP>;
```

### Update `packages/fuul-solana/src/constants.ts`

Update the program ID for your network:

```typescript
export const FUUL_PROGRAM_ID: Record<Network, PublicKey> = {
  // ... other networks
  [Network.DEVNET]: new PublicKey('<NEW_PROGRAM_ID>'),
  // ... other networks
};
```

## Step 6: Rebuild After Constants Update

```bash
# Rebuild program with updated constants
anchor build

# Rebuild SDK
yarn prepare:sdk && yarn build:sdk
```

## Step 7: Deploy Program

```bash
# Deploy to network
anchor deploy --program-name fuul_solana \
  --provider.cluster $NETWORK \
  --provider.wallet $ADMIN_KEYPAIR \
  --program-keypair ./keys/program.json
```

If deployment fails due to network issues, retry the command.

## Step 8: Create Global Config

```bash
# Create global config with signer
yarn scripts create-global-config \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --fee-collector $FEE_COLLECTOR_ACC \
  --signer $SIGNER_KEYPAIR
```

## Step 9: Verify Deployment

```bash
# Verify global config
yarn scripts print-global-config --network $NETWORK
```

Expected output should show:
- `Is Initialized: true`
- Admin, Pauser, Unpauser roles assigned to admin address
- Signer role assigned to signer address
- Fee Collector set correctly

## Upgrading an Existing Deployment

If you need to upgrade an already deployed program:

```bash
# 1. Make code changes

# 2. Rebuild
anchor build

# 3. Upgrade (not deploy)
anchor upgrade --program-id $PROGRAM_ID \
  --provider.cluster $NETWORK \
  --provider.wallet $ADMIN_KEYPAIR \
  target/deploy/fuul_solana.so

# 4. Rebuild SDK if IDL changed
yarn prepare:sdk && yarn build:sdk
```

## Troubleshooting

### "Insufficient funds" error
- Check balance: `solana balance --keypair $ADMIN_KEYPAIR --url $NETWORK`
- Need ~5-7 SOL for initial deploy, ~4-5 SOL for upgrades

### "Seed constraint violated" error
- Constants files have wrong PDA values
- Run `yarn scripts compute-pdas` and update `constants.rs` and `constants.ts`
- Rebuild and redeploy/upgrade

### "Airdrop rate limited" error
- Wait a few minutes and retry
- Use smaller amounts (1 SOL instead of 2)
- For mainnet, transfer SOL manually

### "Write transactions failed" error
- Network congestion, retry the deploy command

## Quick Reference

| Item | Command |
|------|---------|
| Check balance | `solana balance --keypair $ADMIN_KEYPAIR --url $NETWORK` |
| Get program ID | `solana-keygen pubkey ./keys/program.json` |
| Print global config | `yarn scripts print-global-config --network $NETWORK` |
| Compute PDAs | `yarn scripts compute-pdas --network $NETWORK --program-id $PROGRAM_ID` |
