import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, ProjectRole } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import BN from 'bn.js';
import { buildExplorerUrl } from '../../../utils/explorer';

export const revokeProjectRoleCommand = new Command('revoke-project-role')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .requiredOption('--account <account>', 'The account to revoke the role from')
  .requiredOption('--role <role>', 'The role to revoke (admin)')
  .action(async (options) => {
    const { network, projectNonce, account, role } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const revokeProjectRoleIx = await sdk.revokeProjectRole({
      authority: wallet.publicKey,
      projectNonce: new BN(projectNonce),
      account: new PublicKey(account),
      role: role as ProjectRole,
    });

    const tx = new Transaction().add(...revokeProjectRoleIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
