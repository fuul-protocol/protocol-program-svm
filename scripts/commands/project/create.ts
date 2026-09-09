import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../utils/wallet';
import { getConnection } from '../../utils/connection';
import { buildExplorerUrl } from '../../utils/explorer';

export const createProjectCommand = new Command('create-project')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--project-admin <project-admin>', 'The project admin')
  .option('--metadata-uri <metadata-uri>', 'The project metadata URI', '')
  .action(async (options) => {
    const { network, projectAdmin, metadataUri } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const createProjectIx = await sdk.createProject({
      authority: wallet.publicKey,
      projectAdmin: new PublicKey(projectAdmin),
      metadataUri: metadataUri,
    });

    const tx = new Transaction().add(...createProjectIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);

    // Parse LogProjectCreatedEvent from transaction logs using Anchor's event parser
    const parsedTx = await connection.getParsedTransaction(sig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    const projectCreatedEvent = sdk
      .parseTransactionLogs(parsedTx.meta.logMessages ?? [])
      .find((event) => event.name === 'logProjectCreatedEvent');

    if (projectCreatedEvent) {
      console.log(`Created project nonce: ${projectCreatedEvent.data.projectNonce}`);
    } else {
      console.log('Could not parse project nonce from transaction logs.');
    }
  });
