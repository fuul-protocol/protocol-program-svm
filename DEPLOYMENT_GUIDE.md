# Deployment Guide

Step-by-step guide for deploying the Fuul Solana program to a new network.

## Prerequisites

- Solana CLI installed (`solana --version`)
- Anchor CLI 0.32.1 installed (`anchor --version`)
- Node dependencies installed (`yarn install`) — the `yarn scripts` commands import the SDK from the workspace and fail with `MODULE_NOT_FOUND` without it
- Enough SOL in the admin wallet (see [Step 3](#step-3-fund-admin-wallet))
- For mainnet: a private RPC endpoint. A deploy uploads the binary in ~1 KB chunks, which the public RPC rate-limits.

## Step 1: Set Network

```bash
# Options: localhost, devnet, testnet, mainnet
export NETWORK="devnet"
```

The value must match the `Network` enum in `packages/fuul-solana/src/types.ts`. Note that several `--help` strings say `mainnet-beta`; the enum value is `mainnet`.

For mainnet, also export the RPC endpoint. `getConnection` reads `RPC_URL` and, when set, uses it instead of the per-network default:

```bash
export RPC_URL="https://<your-private-rpc>"
```

## Step 2: Create Keypairs

```bash
# Create network-specific folder
mkdir -p ./keys/$NETWORK

# Create program keypair for this network (only if new deployment)
solana-keygen new --outfile ./keys/$NETWORK/program.json --no-bip39-passphrase

# Create network-specific keypairs
solana-keygen new --outfile ./keys/$NETWORK/admin.json --no-bip39-passphrase
solana-keygen new --outfile ./keys/$NETWORK/signer.json --no-bip39-passphrase
solana-keygen new --outfile ./keys/$NETWORK/fee-collector.json --no-bip39-passphrase

chmod 600 ./keys/$NETWORK/*.json

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

> **The admin keypair is the program's upgrade authority** and holds the Admin, Pauser and Unpauser roles. On mainnet it controls the deployed protocol, so treat `./keys/mainnet/admin.json` accordingly. `keys/` is gitignored.

## Step 3: Fund Admin Wallet

```bash
# Check balance
solana balance $ADMIN_ACC --url ${RPC_URL:-$NETWORK}

# For devnet/testnet, use airdrop (may be rate limited)
solana airdrop 2 --url $NETWORK --keypair $ADMIN_KEYPAIR

# For mainnet, transfer SOL manually to the admin address
echo "Fund this address: $ADMIN_ACC"
```

**How much:** almost all of it is rent for the ProgramData account, which is sized at the binary length plus a 45-byte header. Once you have built (Step 4), compute it exactly:

```bash
solana rent $(( $(wc -c < target/deploy/fuul_solana.so) + 45 )) --url ${RPC_URL:-$NETWORK}
```

For reference, the mainnet deploy of a 601,720-byte binary cost **3.90 SOL** in total — 3.81 rent for ProgramData, plus the program account, the on-chain IDL account and transaction fees. Budget ~1 SOL of headroom over what `solana rent` reports.

## Step 4: Build and Sync Keys

```bash
# Initial build
anchor build

# Copy program keypair to target
cp ./keys/$NETWORK/program.json ./target/deploy/fuul_solana-keypair.json

# Sync keys (updates declare_id! in lib.rs)
anchor keys sync --program-name fuul_solana --provider.cluster $NETWORK --provider.wallet $ADMIN_KEYPAIR

# Rebuild with new program ID
anchor build

# Get the new program ID
export PROGRAM_ID=$(solana-keygen pubkey ./keys/$NETWORK/program.json)
echo "Program ID: $PROGRAM_ID"
```

## Step 5: Compute and Update the Global Config PDA

The global config PDA is derived from the program ID, so a new program ID means a new PDA, and it is compiled into the program as a constant.

```bash
yarn scripts compute-pdas --network $NETWORK --program-id $PROGRAM_ID
```

This will output something like:

```
GLOBAL CONFIG PDA: 9j14ndbKE24tDfbwCxFcwgaqxJjvt7TosVy33MvSfxbe
GLOBAL CONFIG BUMP: 253
```

Update `programs/fuul-solana/src/constants.rs` with these values:

```rust
/// Global config address
pub const GLOBAL_CONFIG_ADDRESS: Pubkey = pubkey!("<NEW_PDA_ADDRESS>");
pub const GLOBAL_CONFIG_BUMP: u8 = <NEW_BUMP>;
```

This is the only source file that needs editing. The SDK resolves the program ID per network from `FUUL_PROGRAM_IDL` in `packages/fuul-solana/src/constants.ts`, which reads it out of the per-network IDL file you copy in [Step 8](#step-8-update-sdk-idl) — there is no separate program ID map to maintain.

## Step 6: Rebuild After Constants Update

```bash
anchor build
```

Do not run `yarn prepare:sdk` here — see the warning below. The SDK is rebuilt in Step 8, once the IDL is in place.

> **⚠️ Never manually edit the IDL files**
>
> `packages/fuul-solana/src/idls/fuul.json` and `fuul.ts` are generated. They carry whatever `declare_id!` was set to at build time, and the committed values must be left alone so the LiteSVM tests keep passing.
>
> `yarn prepare:sdk` runs `anchor build` and copies `target/idl/fuul_solana.json` over `fuul.json`. While `declare_id!` points at the network you are deploying to, running it overwrites those files with the wrong program ID. Only run it after [Step 12](#step-12-restore-the-repo-state), or restore the files with `git checkout -- packages/fuul-solana/src/idls/fuul.json packages/fuul-solana/src/idls/fuul.ts`.
>
> - **DO:** copy the deployed IDL to the network file under `idls/solana/` or `idls/fogo/`
> - **DON'T:** hand-edit any address inside an IDL

## Step 7: Deploy Program

```bash
anchor deploy --program-name fuul_solana \
  --provider.cluster ${RPC_URL:-$NETWORK} \
  --provider.wallet $ADMIN_KEYPAIR \
  --program-keypair ./keys/$NETWORK/program.json
```

`--provider.cluster` accepts a full URL, which is how you point the deploy at a private RPC. If deployment fails due to network issues, retry the command.

A failed deploy leaves a rent-paying buffer account behind. List and reclaim any strays once the deploy succeeds:

```bash
solana program show --buffers --url ${RPC_URL:-$NETWORK} -k $ADMIN_KEYPAIR
solana program close <BUFFER_ADDRESS> --url ${RPC_URL:-$NETWORK} -k $ADMIN_KEYPAIR
```

Listing buffers scans all program accounts, which some providers reject with `scan aborted: The accumulated scan results exceeded the limit`. If that happens, compare the admin balance against the rent figure from Step 3 to tell whether anything is stranded.

Verify:

```bash
solana program show $PROGRAM_ID --url ${RPC_URL:-$NETWORK} -k $ADMIN_KEYPAIR
```

Check that `Authority` is the admin address and note the `Data Length` — see [Upgrading](#upgrading-an-existing-deployment) for why it matters.

## Step 8: Update SDK IDL

The deploy generates the IDL at `target/idl/fuul_solana.json` with the correct program ID. Copy it to the network's SDK file:

```bash
# Solana networks
cp target/idl/fuul_solana.json packages/fuul-solana/src/idls/solana/$NETWORK.json

# Fogo networks go in a different folder
# cp target/idl/fuul_solana.json packages/fuul-solana/src/idls/fogo/$NETWORK.json

yarn build:sdk
```

> Use `yarn build:sdk`, not `yarn prepare:sdk`. See the warning in Step 6.

## Step 9: Create Global Config

```bash
yarn scripts create-global-config \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --fee-collector $FEE_COLLECTOR_ACC \
  --signer $SIGNER_KEYPAIR
```

## Step 10: Verify Deployment

```bash
yarn scripts print-global-config --network $NETWORK
```

Expected output should show:

- `Is Initialized: true`
- Admin, Pauser, Unpauser roles assigned to the admin address
- Signer role assigned to the signer address
- Fee Collector set correctly

## Step 11: Add Currency Tokens

Whitelist the tokens that projects can use for rewards distribution. Each token needs a claim limit per cooldown — the maximum claimable across all projects for that token within one cooldown period (set in the global config, 86400s by default). It acts as a circuit breaker and can be raised later with `update-token-currency`.

### Add Native SOL

```bash
# 1000 SOL, in lamports
yarn scripts add-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-type native \
  --claim-limit-per-cooldown 1000000000000
```

### Add SPL Tokens

Confirm the mint and its decimals before whitelisting, since the limit is denominated in base units:

```bash
curl -s ${RPC_URL:-https://api.mainnet-beta.solana.com} -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenSupply","params":["<TOKEN_MINT_ADDRESS>"]}'
```

```bash
# Fungible SPL token — e.g. 1,000,000 of a 9-decimal token
yarn scripts add-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-type fungibleSpl \
  --token-mint <TOKEN_MINT_ADDRESS> \
  --claim-limit-per-cooldown 1000000000000000

# NFT collection
yarn scripts add-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-type nonFungibleSpl \
  --token-mint <NFT_MINT_ADDRESS> \
  --claim-limit-per-cooldown 100
```

### Verify Token Configuration

```bash
yarn scripts print-token-currency \
  --network $NETWORK \
  --token-mint <TOKEN_MINT_ADDRESS>
```

For native SOL, the currency token PDA is derived from the default pubkey — `add-token-currency` passes `PublicKey.default` when `--token-mint` is omitted — so query it with the all-ones address, **not** the wrapped SOL mint:

```bash
yarn scripts print-token-currency \
  --network $NETWORK \
  --token-mint 11111111111111111111111111111111
```

### Update Token Limits Later

```bash
yarn scripts update-token-currency \
  --network $NETWORK \
  --keypair $ADMIN_KEYPAIR \
  --token-mint <TOKEN_MINT_ADDRESS> \
  --claim-limit-per-cooldown 2000000000000 \
  --is-active true
```

## Step 12: Restore the Repo State

Steps 4 and 5 left `declare_id!` and `constants.rs` pointing at the network you just deployed to. Those values are per-deployment and must not be committed, or the tests break with `DeclaredProgramIdMismatch`:

```bash
git checkout -- programs/fuul-solana/src/lib.rs programs/fuul-solana/src/constants.rs
anchor build
```

The rebuild is what matters. `fromWorkspace` loads `target/deploy/fuul_solana.so` at the address in `Anchor.toml`'s `[programs.localnet]`, and the binary fails at runtime unless its compiled-in `declare_id!` matches. Restoring the source without rebuilding leaves the deployed network's ID inside the `.so`.

Also put back the program keypair, so a later `anchor deploy` cannot reuse the one you just deployed with:

```bash
cp ./keys/devnet/program.json ./target/deploy/fuul_solana-keypair.json
```

Confirm before opening a PR:

```bash
yarn lint:all
yarn test:all
```

The only file the deploy should leave changed is the network IDL from Step 8.

## Upgrading an Existing Deployment

```bash
# 1. Make code changes

# 2. Point declare_id! and constants.rs at the target network (Steps 4-5)

# 3. Rebuild
anchor build

# 4. Upgrade (not deploy)
anchor upgrade --program-id $PROGRAM_ID \
  --provider.cluster ${RPC_URL:-$NETWORK} \
  --provider.wallet $ADMIN_KEYPAIR \
  target/deploy/fuul_solana.so

# 5. Copy the IDL and rebuild the SDK if it changed (Step 8)

# 6. Restore the repo state (Step 12)
```

The PDA constants only change on a fresh deployment, not on an upgrade, so Step 5 is just a matter of restoring the values that network was deployed with.

> **⚠️ ProgramData has no spare capacity**
>
> Recent Solana CLI versions allocate exactly the binary length rather than the 2x of older releases. An upgrade whose binary is even one byte larger than the deployed one fails with an account-size error. Compare first:
>
> ```bash
> solana program show $PROGRAM_ID --url ${RPC_URL:-$NETWORK} -k $ADMIN_KEYPAIR  # Data Length
> wc -c < target/deploy/fuul_solana.so
> ```
>
> If the new binary is larger, grow the account before upgrading — this costs additional rent:
>
> ```bash
> solana program extend $PROGRAM_ID <ADDITIONAL_BYTES> \
>   --url ${RPC_URL:-$NETWORK} -k $ADMIN_KEYPAIR
> ```

## Publishing the SDK to npm

### When You'll Need This

- A new deployment or upgrade changed a network IDL
- A new feature or fix is ready to be released
- Dependencies need to be updated for the SDK

> **Note:** We use feature branches (e.g. `feature/sdk-0.5.8`) instead of git tags for version management.

### Step 1: Branch From Main

Merge the deployment PR first, so the release branch carries the new IDL.

```bash
git switch main && git pull
git switch --create feature/sdk-0.5.9
```

> Replace `0.5.9` with the version you are releasing. `main` already holds the release-ready `package.json`; there is no need to branch from the previous release.

### Step 2: Build

```bash
yarn install --immutable
yarn build:sdk
```

### Step 3: Bump the Version

```bash
cd packages/fuul-solana
npm pkg set version=0.5.9
```

### Step 4: Inspect the Tarball

```bash
npm publish --dry-run
```

Check the version, the file list, and that the IDL you just added is in `dist/cjs/idls/`.

### Step 5: Publish

The npm account has 2FA in `auth-and-writes` mode, so publishing requires a one-time password from your authenticator app:

```bash
npm publish --otp=<code>
```

The registry takes a few minutes to index a new version; `npm view @fuul/sdk-solana version` will lag behind the successful publish.

### Step 6: Open the Release PR

Commit the version bump and open a PR against `main`.

## Troubleshooting

### `MODULE_NOT_FOUND` when running `yarn scripts`
- Dependencies are not installed. Run `yarn install` at the repo root.

### "Insufficient funds" error
- Check balance: `solana balance $ADMIN_ACC --url ${RPC_URL:-$NETWORK}`
- Recompute the requirement with the `solana rent` command in Step 3

### "Seed constraint violated" error
- `constants.rs` has the wrong PDA for the program ID being used
- Run `yarn scripts compute-pdas`, update `constants.rs`, rebuild, redeploy or upgrade

### "Airdrop rate limited" error
- Wait a few minutes and retry, or use smaller amounts (1 SOL instead of 2)
- For mainnet, transfer SOL manually

### "Write transactions failed" during deploy
- Network congestion or RPC rate limiting. Retry the command; on mainnet, use a private RPC via `RPC_URL`.

### Account-size error on upgrade
- The new binary is larger than the deployed one. See the ProgramData warning in [Upgrading](#upgrading-an-existing-deployment) and run `solana program extend`.

### `DeclaredProgramIdMismatch` in tests (all tests failing)
- The `declare_id!` compiled into `target/deploy/fuul_solana.so` differs from the address in `Anchor.toml`'s `[programs.localnet]`
- Run Step 12 to restore the repo state, and make sure you rebuild

### `InvalidProgramForExecution` in tests
- The generated IDL files were overwritten with a non-committed address, usually by running `yarn prepare:sdk` mid-deploy
- `git checkout -- packages/fuul-solana/src/idls/fuul.json packages/fuul-solana/src/idls/fuul.ts`

## Quick Reference

| Item | Command |
|------|---------|
| Check balance | `solana balance $ADMIN_ACC --url ${RPC_URL:-$NETWORK}` |
| Get program ID | `solana-keygen pubkey ./keys/$NETWORK/program.json` |
| Show deployed program | `solana program show $PROGRAM_ID --url ${RPC_URL:-$NETWORK} -k $ADMIN_KEYPAIR` |
| Rent for a deploy | `solana rent $(( $(wc -c < target/deploy/fuul_solana.so) + 45 ))` |
| Print global config | `yarn scripts print-global-config --network $NETWORK` |
| Print native SOL currency | `yarn scripts print-token-currency --network $NETWORK --token-mint 11111111111111111111111111111111` |
| Compute PDAs | `yarn scripts compute-pdas --network $NETWORK --program-id $PROGRAM_ID` |

## Deployed Networks

| Network | Program ID |
|---------|------------|
| Solana mainnet | `HWjEC6rpZ84FpfokKwnh4EfX4Dry1YsaC8R8A54uyJg9` |
| Solana devnet | `DiMe3wTNXQcJv8i2chyiwJcjtGcy6zooVsgig9cfihSg` |
| Fogo mainnet | `78uuPoG2VCseXHrZY17dwPEGhHe6aGZ8GSVRZbaKZvyf` |
