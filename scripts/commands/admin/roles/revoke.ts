import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, GlobalRole } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const revokeGlobalRoleCommand = new Command('revoke-global-role')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--account <account>', 'The account to revoke the role from')
  .requiredOption('--role <role>', 'The role to revoke (admin, pauser, unpauser, signer)')
  .action(async (options) => {
    const { network, account, role } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const revokeGlobalRoleIx = await sdk.revokeGlobalRole({
      authority: wallet.publicKey,
      account: new PublicKey(account),
      role: role as GlobalRole,
    });

    const tx = new Transaction().add(...revokeGlobalRoleIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
