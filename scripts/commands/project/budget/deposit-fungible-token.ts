import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import BN from 'bn.js';
import { buildExplorerUrl } from '../../../utils/explorer';

export const depositFungibleTokenCommand = new Command('deposit-fungible-token')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .requiredOption('--amount <amount>', 'The amount to deposit')
  .option('--token-mint <token-mint>', 'The token mint')
  .action(async (options) => {
    const { network, projectNonce, tokenMint, amount } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const depositFungibleTokenIx = await sdk.depositFungibleToken({
      authority: wallet.publicKey,
      projectNonce: new BN(projectNonce),
      tokenMint: tokenMint ? new PublicKey(tokenMint) : PublicKey.default,
      amount: new BN(amount),
    });

    const tx = new Transaction().add(...depositFungibleTokenIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
