import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import * as anchor from '@coral-xyz/anchor';
import { getConnection } from '../../../utils/connection';
import { buildExplorerUrl } from '../../../utils/explorer';

export const updateCurrencyToken = new Command('update-token-currency')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--token-mint <token-mint>', 'The token mint')
  .option('--claim-limit-per-cooldown <claim-limit-per-cooldown>', 'The claim limit per cooldown')
  .option('--is-active <is-active>', 'The active status of the currency token')
  .action(async (options) => {
    const { network, tokenMint, claimLimitPerCooldown, isActive } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const addCurrencyTokenLimitIx = await sdk.updateCurrencyToken({
      authority: wallet.publicKey,
      tokenMint: new PublicKey(tokenMint),
      claimLimitPerCooldown: new anchor.BN(claimLimitPerCooldown),
      isActive: isActive,
    });

    const tx = new Transaction().add(...addCurrencyTokenLimitIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
