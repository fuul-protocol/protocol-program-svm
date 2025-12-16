import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, GlobalRole } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const renounceGlobalRoleCommand = new Command('renounce-global-role')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--role <role>', 'The role to renounce (admin, pauser, unpauser, signer)')
  .action(async (options) => {
    const { network, role } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const renounceGlobalRoleIx = await sdk.renounceGlobalRole({
      authority: wallet.publicKey,
      role: role as GlobalRole,
    });

    const tx = new Transaction().add(...renounceGlobalRoleIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
