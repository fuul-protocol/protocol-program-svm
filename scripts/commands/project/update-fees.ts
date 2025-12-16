import 'dotenv/config';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../utils/wallet';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../../utils/connection';
import { buildExplorerUrl } from '../../utils/explorer';

export const updateProjectFeesCommand = new Command('update-project-fees')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .option(
    '--user-native-claim-fee <user-native-claim-fee>',
    'The user native claim fee in lamports',
  )
  .option(
    '--project-claim-fee <project-claim-fee>',
    'The project claim fee in basis points (0-10000)',
  )
  .option('--remove-fee <remove-fee>', 'The remove fee in basis points (0-10000)')
  .action(async (options) => {
    const { network, projectNonce, userNativeClaimFee, projectClaimFee, removeFee } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const updateProjectFeesIx = await sdk.updateProjectFees({
      authority: wallet.publicKey,
      projectNonce: new anchor.BN(projectNonce),
      userNativeClaimFee: userNativeClaimFee ? new anchor.BN(userNativeClaimFee) : undefined,
      projectClaimFee: projectClaimFee ? Number(projectClaimFee) : undefined,
      removeFee: removeFee ? Number(removeFee) : undefined,
    });

    const tx = new Transaction().add(...updateProjectFeesIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
