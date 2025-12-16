import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk, TokenType } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import * as anchor from '@coral-xyz/anchor';
import { buildExplorerUrl } from '../../../utils/explorer';

export const addCurrencyTokenCommand = new Command('add-token-currency')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption(
    '--token-type <token-type>',
    'The token type (native, fungibleSpl, nonFungibleSpl)',
  )
  .option('--token-mint <token-mint>', 'The token mint')
  .requiredOption(
    '--claim-limit-per-cooldown <claim-limit-per-cooldown>',
    'The claim limit per cooldown',
  )
  .action(async (options) => {
    const { network, tokenType, tokenMint, claimLimitPerCooldown } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const addCurrencyTokenIx = await sdk.addCurrencyToken({
      authority: wallet.publicKey,
      tokenType: tokenType as TokenType,
      tokenMint: tokenMint ? new PublicKey(tokenMint) : PublicKey.default,
      claimLimitPerCooldown: new anchor.BN(claimLimitPerCooldown),
    });

    const tx = new Transaction().add(...addCurrencyTokenIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
