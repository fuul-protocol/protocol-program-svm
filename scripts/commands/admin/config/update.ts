import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const updateGlobalConfigCommand = new Command('update-global-config')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .option('--claim-cool-down <claim-cool-down>', 'The claim cool down')
  .option(
    '--required-signers-for-claim <required-signers-for-claim>',
    'The required signers for a claim',
  )
  .action(async (options) => {
    const { network, claimCoolDown, requiredSignersForClaim } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const updateGlobalConfigIx = await sdk.updateGlobalConfig({
      authority: wallet.publicKey,
      claimCoolDown: claimCoolDown ? new anchor.BN(claimCoolDown) : undefined,
      requiredSignersForClaim: requiredSignersForClaim
        ? Number(requiredSignersForClaim)
        : undefined,
    });

    const tx = new Transaction().add(...updateGlobalConfigIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
