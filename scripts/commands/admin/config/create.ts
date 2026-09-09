import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const createGlobalConfigCommand = new Command('create-global-config')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the admin keypair')
  .requiredOption('--fee-collector <fee-collector>', 'The fee collector')
  .requiredOption(
    '--signer <signer>',
    'The path to the signer keypair (the account that will have the Signer role)',
  )
  .action(async (options) => {
    const { network, feeCollector } = options;

    const wallet = loadWallet(options.keypair);
    const signerWallet = loadWallet(options.signer);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const createGlobalConfigIx = await sdk.createGlobalConfig({
      authority: wallet.publicKey,
      feeCollector: new PublicKey(feeCollector),
      initialSigner: signerWallet.publicKey,
    });

    const tx = new Transaction().add(...createGlobalConfigIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
