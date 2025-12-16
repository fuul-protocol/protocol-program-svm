# Fuul SDK 

### Install

```bash
nvm use && yarn install
```

### Build

```bash
# build all
yarn build

# Build all
yarn build:esm
yarn build:cjs
```

### Docs

Generate

```bash 
yarn docs
```

Serve locally

```bash
yarn docs:serve
```

### Testing

Tests for this SDK are run at the workspace level from the repository root. Use `yarn build:docs && yarn test:all` to execute all tests across packages, including the SDK. 

## Usage

The sdk has some read and some write operations. Find details about each method with `yarn docs && yarn docs:serve`

#### Reading Data

To read data from the blockchain, use the getter methods. For example, to read the global config:

```typescript
import { Connection } from '@solana/web3.js';
import { FuulSdk, Network } from '@wakeuplabs/fuul-solana';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const sdk = new FuulSdk(connection, Network.MAINNET);

// Read global config
const globalConfig = await sdk.getGlobalConfig();

if (globalConfig) {
  console.log('Paused:', globalConfig.paused);
  console.log('Project Nonce:', globalConfig.projectNonce.toString());
  console.log('Claim Cool Down:', globalConfig.claimCoolDown.toString());
  console.log('Fee Collector:', globalConfig.feeManagement.feeCollector.toString());
  console.log('User Native Claim Fee:', globalConfig.feeManagement.userNativeClaimFee.toString());
  console.log('Project Claim Fee:', globalConfig.feeManagement.projectClaimFee.toString());
  console.log('Remove Fee:', globalConfig.feeManagement.removeFee.toString());
}
```

#### Sending Transactions

To send a transaction, create instructions using the SDK methods, add them to a transaction, and send it. For example, to update global fees:

```typescript
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, Network } from '@wakeuplabs/fuul-solana';
import * as anchor from '@coral-xyz/anchor';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const sdk = new FuulSdk(connection, Network.MAINNET);
const wallet = Keypair.fromSecretKey(/* your secret key */);

// Create instructions to update global fees
const updateFeesInstructions = await sdk.updateGlobalConfigFees({
  authority: wallet.publicKey,
  userNativeClaimFee: new anchor.BN(1000000), // 0.001 SOL in lamports
  projectClaimFee: new anchor.BN(100), // 1% in basis points (100/10000)
  removeFee: new anchor.BN(50), // 0.5% in basis points (50/10000)
  // feeCollector is optional - only include if you want to update it
});

// Build and send the transaction
const transaction = new Transaction().add(...updateFeesInstructions);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [wallet],
  { commitment: 'confirmed' }
);

console.log(`Transaction confirmed: ${signature}`);
```

#### Batching Transactions

You can batch multiple operations into a single transaction by combining multiple instruction arrays:

```typescript
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, Network } from '@wakeuplabs/fuul-solana';
import * as anchor from '@coral-xyz/anchor';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const sdk = new FuulSdk(connection, Network.MAINNET);
const wallet = Keypair.fromSecretKey(/* your secret key */);

// Create multiple instruction sets
const updateFeesInstructions = await sdk.updateGlobalConfigFees({
  authority: wallet.publicKey,
  userNativeClaimFee: new anchor.BN(1000000),
  projectClaimFee: new anchor.BN(100),
});

const updateConfigInstructions = await sdk.updateGlobalConfig({
  authority: wallet.publicKey,
  claimCoolDown: new anchor.BN(86400), // 1 day in seconds
  requiredSignersForClaim: 2,
});

// Batch all instructions into a single transaction
const transaction = new Transaction().add(
  ...updateFeesInstructions,
  ...updateConfigInstructions
);

// Send the batched transaction
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [wallet],
  { commitment: 'confirmed' }
);

console.log(`Batched transaction confirmed: ${signature}`);
```

Note: When batching transactions, make sure all instructions are compatible and can be executed in the same transaction. Some operations may have dependencies or constraints that prevent them from being batched together.

