import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const updateGlobalConfigFeesCommand = new Command('update-global-config-fees')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .option('--fee-collector <fee-collector>', 'The fee collector public key')
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
    const { network, feeCollector, userNativeClaimFee, projectClaimFee, removeFee } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const updateGlobalConfigIx = await sdk.updateGlobalConfigFees({
      authority: wallet.publicKey,
      feeCollector: feeCollector ? new PublicKey(feeCollector) : undefined,
      userNativeClaimFee: userNativeClaimFee ? new anchor.BN(userNativeClaimFee) : undefined,
      projectClaimFee: projectClaimFee ? Number(projectClaimFee) : undefined,
      removeFee: removeFee ? Number(removeFee) : undefined,
    });

    const tx = new Transaction().add(...updateGlobalConfigIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
