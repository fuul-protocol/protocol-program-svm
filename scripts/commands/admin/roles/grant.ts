import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, GlobalRole } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const grantGlobalRoleCommand = new Command('grant-global-role')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--account <account>', 'The account to grant the role to')
  .requiredOption('--role <role>', 'The role to grant (admin, pauser, unpauser, signer)')
  .action(async (options) => {
    const { network, account, role } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const grantGlobalRoleIx = await sdk.grantGlobalRole({
      authority: wallet.publicKey,
      account: new PublicKey(account),
      role: role as GlobalRole,
    });

    const tx = new Transaction().add(...grantGlobalRoleIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
