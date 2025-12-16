import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const pauseProgramCommand = new Command('pause-program')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .action(async (options) => {
    const { network } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const pauseProgramIx = await sdk.pauseProgram({
      authority: wallet.publicKey,
    });

    const tx = new Transaction().add(...pauseProgramIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
