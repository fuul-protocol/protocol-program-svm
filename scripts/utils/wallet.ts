import * as anchor from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';

export const loadWallet = (walletPath: string): anchor.Wallet => {
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  return new anchor.Wallet(wallet);
};
