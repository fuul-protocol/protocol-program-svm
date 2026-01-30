import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  FuulSdk,
  getProjectPda,
  MessageDomain,
  TokenType,
} from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { getConnection } from '../../../utils/connection';
import { BN } from '@coral-xyz/anchor';
import { loadWallet } from '../../../utils/wallet';
import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { buildExplorerUrl } from '../../../utils/explorer';

export const claimProjectCurrencyBudgetCommand = new Command('claim')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .requiredOption('--token-mint <token-mint>', 'The token mint', '11111111111111111111111111111111')
  .requiredOption(
    '--token-type <token-type>',
    'The token type (native, fungibleSpl, nonFungibleSpl)',
    'native',
  )
  .requiredOption('--recipient <recipient>', 'The recipient')
  .requiredOption('--amount <amount>', 'The amount')
  .requiredOption('--deadline <deadline>', 'The deadline')
  .requiredOption('--reason <reason>', 'The reason (affiliatePayout, endUserPayout)')
  .requiredOption('--proof <proof>', 'The unique identifier for the claim (base58 encoded)')
  .requiredOption('--signatures <signatures>', 'The signatures (comma separated)')
  .requiredOption('--signers <signers>', 'The signers (comma separated)')
  .action(async (options) => {
    const { network, projectNonce, tokenMint, tokenType, recipient, amount, deadline, reason } =
      options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const [projectPda] = getProjectPda(sdk.getProgram().programId, new BN(projectNonce));
    const signaturesBuffer = options.signatures
      .split(',')
      .map((signature) => bs58.decode(signature));
    const signersArray = options.signers.split(',').map((signer) => new PublicKey(signer));
    const signatures = signersArray.map((signer, index) => ({
      signature: signaturesBuffer[index],
      signer: signer,
    }));

    const projectCurrencyBudget = await sdk.claim({
      authority: wallet.publicKey,
      projectNonce: new BN(projectNonce),
      message: new ClaimMessage({
        data: new ClaimMessageData({
          amount: amount,
          project: projectPda,
          recipient: new PublicKey(recipient),
          tokenType: tokenType as TokenType,
          tokenMint: new PublicKey(tokenMint),
          proof: Buffer.from(bs58.decode(options.proof)),
          reason: reason as ClaimReason,
        }),
        domain: new MessageDomain({
          programId: sdk.getProgram().programId,
          deadline: deadline,
          version: 1,
        }),
      }),
      signatures,
    });

    const tx = new Transaction().add(...projectCurrencyBudget);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
