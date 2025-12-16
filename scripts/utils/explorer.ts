import { Network } from '@wakeuplabs/fuul-solana';

export const buildExplorerUrl = (network: Network, signature: string) => {
  switch (network) {
    case Network.LOCALHOST:
      return `https://explorer.solana.com/tx/${signature}?cluster=localhost`;
    case Network.DEVNET:
      return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    case Network.MAINNET:
      return `https://explorer.solana.com/tx/${signature}?cluster=mainnet`;
    case Network.TESTNET:
      return `https://explorer.solana.com/tx/${signature}?cluster=testnet`;
    case Network.FOGO_TESTNET:
      return `https://explorer.fogo.io/tx/${signature}?cluster=testnet`;
    case Network.FOGO_MAINNET:
      return `https://explorer.fogo.io/tx/${signature}?cluster=mainnet`;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};
