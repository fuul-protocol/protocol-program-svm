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

> **⚠️ IMPORTANT: Never manually edit the IDL files**
>
> The IDL files (`packages/fuul-solana/src/idls/fuul.json` and `fuul.ts`) must always use the **localnet program ID** (`7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg`) so that tests pass.
>
> - **DO:** Update `packages/fuul-solana/src/constants.ts` with network-specific program IDs
> - **DON'T:** Manually change addresses in the IDL files
>
> The SDK uses `constants.ts` to select the correct program ID per network at runtime. The IDL addresses are only used for local testing with LiteSVM.

## Step 7: Deploy Program

```bash
# Deploy to network
anchor deploy --program-name fuul_solana \
  --provider.cluster $NETWORK \
  --provider.wallet $ADMIN_KEYPAIR \
  --program-keypair ./keys/program.json
```

If deployment fails due to network issues, retry the command.

### Update SDK IDL

After deployment, the new IDL is generated at `target/idl/fuul_solana.json`. Copy it to the SDK:

```bash
# Copy IDL to SDK (use the appropriate network folder)
cp target/idl/fuul_solana.json packages/fuul-solana/src/idls/solana/$NETWORK.json
```

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

## Step 10: Add Currency Tokens

After deployment, you must whitelist the tokens that projects can use for rewards distribution. Each token requires a claim limit per cooldown period.

### Add Native SOL

```bash
# Add native SOL with claim limit (in lamports)
# Example: 1000 SOL = 1000000000000 lamports
yarn scripts add-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-type native \
  --claim-limit-per-cooldown 1000000000000
```

### Add SPL Tokens

```bash
# Add a fungible SPL token
# Example: USDC with 1,000,000 USDC limit (6 decimals = 1000000000000)
yarn scripts add-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-type fungibleSpl \
  --token-mint <TOKEN_MINT_ADDRESS> \
  --claim-limit-per-cooldown 1000000000000

# Add an NFT collection
yarn scripts add-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-type nonFungibleSpl \
  --token-mint <NFT_MINT_ADDRESS> \
  --claim-limit-per-cooldown 100
```

### Verify Token Configuration

```bash
# Check token configuration
yarn scripts print-token-currency \
  --network $NETWORK \
  --token-mint <TOKEN_MINT_ADDRESS>

# For native SOL, use the native mint address
yarn scripts print-token-currency \
  --network $NETWORK \
  --token-mint So11111111111111111111111111111111111111112
```

### Update Token Limits Later

```bash
# Update claim limit or activation status
yarn scripts update-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-mint <TOKEN_MINT_ADDRESS> \
  --claim-limit-per-cooldown 2000000000000 \
  --is-active true
```

**Note:** The `claim-limit-per-cooldown` defines the maximum amount that can be claimed across all projects for that token within a single cooldown period (configured in global config).

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

# 4. If IDL changed, copy to SDK
cp target/idl/fuul_solana.json packages/fuul-solana/src/idls/solana/$NETWORK.json

# 5. Rebuild SDK
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

### "InvalidProgramForExecution" in tests (all tests failing)
- The IDL files were likely modified with non-localnet addresses
- Run `yarn prepare:sdk` to regenerate IDL with correct localnet program ID
- Never manually edit the IDL files - update `constants.ts` for network-specific IDs instead

## Quick Reference

| Item | Command |
|------|---------|
| Check balance | `solana balance --keypair $ADMIN_KEYPAIR --url $NETWORK` |
| Get program ID | `solana-keygen pubkey ./keys/program.json` |
| Print global config | `yarn scripts print-global-config --network $NETWORK` |
| Compute PDAs | `yarn scripts compute-pdas --network $NETWORK --program-id $PROGRAM_ID` |
