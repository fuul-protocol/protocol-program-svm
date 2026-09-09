import { PublicKey } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { getConnection } from '../../../utils/connection';

export const printCurrencyTokenCommand = new Command('print-token-currency')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .option('--token-mint <token-mint>', 'The token mint')
  .action(async (options) => {
    const { network, tokenMint } = options;

    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const currencyToken = await sdk.getCurrencyToken(
      tokenMint ? new PublicKey(tokenMint) : PublicKey.default,
    );
    console.log('Currency Token:');
    console.log(`  Is Active: ${currencyToken.isActive}`);
    console.log(`  Token Account: ${currencyToken.tokenMint}`);
    console.log(`  Token Type: ${Object.keys(currencyToken.tokenType)}`);
    console.log(`  Claim Limit Per Cooldown: ${currencyToken.claimLimitPerCooldown}`);
    console.log(`  Cumulative Claim Per Cooldown: ${currencyToken.cumulativeClaimPerCooldown}`);
    console.log(`  Claim Cooldown Period Started: ${currencyToken.claimCooldownPeriodStarted}`);
  });
