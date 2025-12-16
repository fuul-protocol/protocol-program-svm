import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const removeNoClaimFeeWhitelistCommand = new Command('remove-no-claim-fee-whitelist')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--account <account>', 'The wallet address to remove from the whitelist')
  .action(async (options) => {
    const { network, account } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const removeWhitelistIx = await sdk.removeNoClaimFeeWhitelist({
      authority: wallet.publicKey,
      account: new PublicKey(account),
    });

    const tx = new Transaction().add(...removeWhitelistIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
    console.log(`Removed ${account} from the no claim fee whitelist`);
  });
