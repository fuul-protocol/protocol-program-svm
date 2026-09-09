import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  FuulSdk,
  getProjectPda,
  MessageDomain,
  TokenType,
} from '@fuul/sdk-solana';
import { Command } from 'commander';
import { getConnection } from '../../../utils/connection';
import { BN } from '@coral-xyz/anchor';
import { loadWallet } from '../../../utils/wallet';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import * as crypto from 'crypto';

export const createClaimVoucherCommand = new Command('create-claim-voucher')
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
  .requiredOption('--reason <reason>', 'The reason (affiliatePayout, endUserPayout)')
  .requiredOption('--recipient <recipient>', 'The recipient')
  .requiredOption('--amount <amount>', 'The amount')
  .requiredOption(
    '--deadline <deadline>',
    'The delta time in seconds from now when voucher expires',
    '3600',
  )
  .requiredOption('--proof <proof>', 'The unique identifier for the claim (base58 encoded)')
  .action(async (options) => {
    const { network, projectNonce, tokenMint, tokenType, reason, recipient, amount, deadline } =
      options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const [projectPda] = getProjectPda(sdk.getProgram().programId, new BN(projectNonce));
    const proof = options.proof ? Buffer.from(bs58.decode(options.proof)) : crypto.randomBytes(32);

    // Compute absolute deadline based on user input
    const computedDeadline = Math.floor(Date.now() / 1000) + parseInt(deadline);

    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: amount,
        project: projectPda,
        recipient: new PublicKey(recipient),
        tokenType: tokenType as TokenType,
        tokenMint: new PublicKey(tokenMint),
        proof,
        reason: reason as ClaimReason,
      }),
      domain: new MessageDomain({
        programId: sdk.getProgram().programId,
        version: 1,
        deadline: computedDeadline,
      }),
    });

    // sign the message
    const signatures = await claimMessage.sign([wallet.payer]);
    console.log(
      JSON.stringify(
        {
          data: {
            amount: amount,
            project: projectPda.toBase58(),
            recipient: recipient,
            tokenType: tokenType,
            tokenMint: tokenMint,
            proof: bs58.encode(proof),
            reason: reason,
          },
          domain: {
            programId: sdk.getProgram().programId.toBase58(),
            version: 1,
            deadline: computedDeadline.toString(),
          },
          proof: bs58.encode(proof),
          signatures: signatures.map((signature) => ({
            signature: bs58.encode(signature.signature),
            signer: signature.signer.toBase58(),
          })),
        },
        null,
        2,
      ),
    );
  });
