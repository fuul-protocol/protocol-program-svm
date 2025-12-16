import { Network } from '@wakeuplabs/fuul-solana';
import { clusterApiUrl } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';

export const getConnection = (network: Network | string) => {
  switch (network) {
    case Network.LOCALHOST:
      return new Connection('http://127.0.0.1:8899', 'confirmed');
    case Network.DEVNET:
      return new Connection(clusterApiUrl('devnet'), 'confirmed');
    case Network.MAINNET:
      return new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    case Network.TESTNET:
      return new Connection(clusterApiUrl('testnet'), 'confirmed');
    case Network.FOGO_TESTNET:
      return new Connection('https://testnet.fogo.io', 'confirmed');
    case Network.FOGO_MAINNET:
      return new Connection('https://mainnet.fogo.io', 'confirmed');
    default:
      return new Connection(network, 'confirmed');
  }
};
