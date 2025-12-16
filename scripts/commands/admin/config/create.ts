import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const createGlobalConfigCommand = new Command('create-global-config')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--fee-collector <fee-collector>', 'The fee collector')
  .action(async (options) => {
    const { network, feeCollector } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const createGlobalConfigIx = await sdk.createGlobalConfig({
      authority: wallet.publicKey,
      feeCollector: new PublicKey(feeCollector),
    });

    const tx = new Transaction().add(...createGlobalConfigIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
