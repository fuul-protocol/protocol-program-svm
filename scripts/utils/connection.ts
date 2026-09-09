import { Network } from '@fuul/sdk-solana';
import { clusterApiUrl } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';

export const getConnection = (network: Network | string) => {
  // Allows overriding the RPC endpoint (e.g. a private mainnet RPC) without
  // changing the --network flag, which also selects the program ID and IDL.
  const rpcUrlOverride = process.env.RPC_URL;
  if (rpcUrlOverride) {
    return new Connection(rpcUrlOverride, 'confirmed');
  }

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
