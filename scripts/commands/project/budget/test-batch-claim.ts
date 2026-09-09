import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  FuulSdk,
  getProjectPda,
  MessageDomain,
  Signature,
  TokenType,
} from '@fuul/sdk-solana';
import { Command } from 'commander';
import { getConnection } from '../../../utils/connection';
import { BN } from '@coral-xyz/anchor';
import { loadWallet } from '../../../utils/wallet';
import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import * as crypto from 'crypto';
import { buildExplorerUrl } from '../../../utils/explorer';

const NUM_CLAIMS = 5;
const CLAIM_AMOUNT = 100_000; // 0.0001 SOL in lamports
const DEADLINE_SECONDS = 3600;

export const testBatchClaimCommand = new Command('test-batch-claim')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the admin keypair (global config admin)')
  .requiredOption('--signer-keypair <signer-keypair>', 'The path to the signer keypair')
  .option('--recipient <recipient>', 'The recipient address (defaults to admin pubkey)')
  .option('--num-claims <num-claims>', 'Number of claims to create', String(NUM_CLAIMS))
  .option('--claim-amount <claim-amount>', 'Amount per claim in lamports', String(CLAIM_AMOUNT))
  .action(async (options) => {
    const { network } = options;
    const numClaims = parseInt(options.numClaims);
    const claimAmount = parseInt(options.claimAmount);
    const depositAmount = claimAmount * numClaims * 2;

    const adminWallet = loadWallet(options.keypair);
    const signerWallet = loadWallet(options.signerKeypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);
    const programId = sdk.getProgram().programId;

    const recipient = options.recipient ? new PublicKey(options.recipient) : adminWallet.publicKey;

    console.log('=== Test Batch Claim ===');
    console.log(`Network: ${network}`);
    console.log(`Program ID: ${programId.toBase58()}`);
    console.log(`Admin: ${adminWallet.publicKey.toBase58()}`);
    console.log(`Signer: ${signerWallet.publicKey.toBase58()}`);
    console.log(`Recipient: ${recipient.toBase58()}`);
    console.log(`Num Claims: ${numClaims}`);
    console.log(`Claim Amount: ${claimAmount} lamports (${claimAmount / 1e9} SOL)`);
    console.log(`Deposit Amount: ${depositAmount} lamports (${depositAmount / 1e9} SOL)`);
    console.log('');

    // Step 1: Create project
    console.log('Step 1: Creating project...');
    const createProjectIx = await sdk.createProject({
      authority: adminWallet.publicKey,
      projectAdmin: adminWallet.publicKey,
    });
    const createProjectTx = new Transaction().add(...createProjectIx);
    const createProjectSig = await sendAndConfirmTransaction(connection, createProjectTx, [
      adminWallet.payer,
    ]);
    console.log(`  Tx: ${buildExplorerUrl(network, createProjectSig)}`);

    const parsedTx = await connection.getParsedTransaction(createProjectSig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    const projectCreatedEvent = sdk
      .parseTransactionLogs(parsedTx!.meta!.logMessages ?? [])
      .find((event) => event.name === 'logProjectCreatedEvent');

    if (!projectCreatedEvent) {
      throw new Error('Could not parse project nonce from transaction logs');
    }

    const projectNonce = projectCreatedEvent.data.projectNonce as BN;
    const [projectPda] = getProjectPda(programId, projectNonce);
    console.log(`  Project nonce: ${projectNonce}`);
    console.log(`  Project PDA: ${projectPda.toBase58()}`);
    console.log('');

    // Step 2: Deposit native SOL
    console.log('Step 2: Depositing native SOL...');
    const depositIx = await sdk.depositFungibleToken({
      authority: adminWallet.publicKey,
      projectNonce,
      tokenMint: PublicKey.default,
      amount: new BN(depositAmount),
    });
    const depositTx = new Transaction().add(...depositIx);
    const depositSig = await sendAndConfirmTransaction(connection, depositTx, [adminWallet.payer]);
    console.log(`  Tx: ${buildExplorerUrl(network, depositSig)}`);
    console.log('');

    // Step 3: Create claim vouchers
    console.log(`Step 3: Creating ${numClaims} claim vouchers...`);
    const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;

    const vouchers: { message: ClaimMessage; signatures: Signature[]; proof: Buffer }[] = [];

    for (let i = 0; i < numClaims; i++) {
      const proof = crypto.randomBytes(32);

      const claimMessage = new ClaimMessage({
        data: new ClaimMessageData({
          amount: claimAmount,
          project: projectPda,
          recipient,
          tokenType: TokenType.Native,
          tokenMint: PublicKey.default,
          proof,
          reason: ClaimReason.EndUserPayout,
        }),
        domain: new MessageDomain({
          programId,
          version: 1,
          deadline,
        }),
      });

      const signatures = claimMessage.sign([signerWallet.payer]);
      vouchers.push({ message: claimMessage, signatures, proof });
      console.log(`  Voucher ${i + 1}: proof=${proof.toString('hex').slice(0, 16)}...`);
    }
    console.log('');

    // Step 4: Execute all claims in a single transaction
    console.log('Step 4: Executing all claims in a single transaction...');
    const claimTx = new Transaction();

    for (let i = 0; i < vouchers.length; i++) {
      const voucher = vouchers[i];
      const claimIxs = await sdk.claim({
        authority: adminWallet.publicKey,
        projectNonce,
        message: voucher.message,
        signatures: voucher.signatures,
      });
      claimTx.add(...claimIxs);
    }

    const claimSig = await sendAndConfirmTransaction(connection, claimTx, [adminWallet.payer]);
    console.log(`  Tx: ${buildExplorerUrl(network, claimSig)}`);
    console.log('');
    console.log(`All ${numClaims} claims executed successfully in a single transaction!`);
  });
