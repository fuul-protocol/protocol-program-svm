import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { getConnection } from '../../../utils/connection';
import { PublicKey } from '@solana/web3.js';

export const printProjectCurrencyBudgetCommand = new Command('print-project-currency-budget')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .requiredOption('--token-mint <token-mint>', 'The token mint', '11111111111111111111111111111111')
  .action(async (options) => {
    const { network, projectNonce, tokenMint } = options;

    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const projectCurrencyBudget = await sdk.getProjectCurrencyBudget(
      projectNonce,
      new PublicKey(tokenMint),
    );

    console.log('Project Currency Budget:');
    console.log(`  Budget: ${projectCurrencyBudget.budget}`);
    console.log(`  Token Mint: ${projectCurrencyBudget.tokenMint.toBase58()}`);
    console.log(`  Token Account: ${projectCurrencyBudget.tokenAccount?.toBase58() ?? 'None'}`);
  });
