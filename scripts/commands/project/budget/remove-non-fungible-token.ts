import { PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { loadWallet } from '../../../utils/wallet';
import { getConnection } from '../../../utils/connection';
import BN from 'bn.js';
import { buildExplorerUrl } from '../../../utils/explorer';

export const removeNonFungibleTokenCommand = new Command('remove-non-fungible-token')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the signer keypair')
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .requiredOption('--token-mint <token-mint>', 'The token mint address')
  .action(async (options) => {
    const { network, projectNonce, tokenMint } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const removeNonFungibleTokenIx = await sdk.removeNonFungibleToken({
      authority: wallet.publicKey,
      projectNonce: new BN(projectNonce),
      tokenMint: new PublicKey(tokenMint),
    });

    const tx = new Transaction().add(...removeNonFungibleTokenIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`NFT removed successfully!`);
    console.log(`Transaction: ${buildExplorerUrl(network, sig)}`);
  });
