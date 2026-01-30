import * as anchor from '@coral-xyz/anchor';
import { FuulIdl } from '../idls/fuul';
import { Network } from '../types';
import { PublicKey } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { FUUL_PROGRAM_IDL } from '../constants';

/**
 * Gets an Anchor program instance for the Fuul program.
 *
 * @param opts - The options for getting the program
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment (mainnet, devnet, testnet, localhost)
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @returns The Anchor program instance for the Fuul program
 */
export const getProgram = (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
}): anchor.Program<FuulIdl> => {
  return new anchor.Program(
    {
      ...FUUL_PROGRAM_IDL[opts.network],
      address: opts.programId?.toBase58() ?? FUUL_PROGRAM_IDL[opts.network].address,
    } as FuulIdl,
    { connection: opts.connection },
  );
};

/**
 * Checks if an account exists on the blockchain.
 *
 * @param connection - The Solana connection
 * @param address - The public key of the account to check
 * @returns True if the account exists, false otherwise
 */
const accountExists = async (
  connection: anchor.web3.Connection,
  address: PublicKey,
): Promise<boolean> => {
  try {
    const info = await connection.getAccountInfo(address);
    return info !== null;
  } catch {
    // LiteSVM throws an error for non-existent accounts instead of returning null
    return false;
  }
};

/**
 * Ensures that associated token accounts (ATAs) exist for the given token accounts.
 * Creates instructions to create any missing ATAs.
 *
 * @param connection - The Solana connection
 * @param payer - The account that will pay for the ATA creation fees
 * @param mint - The token mint public key
 * @param tokenAccounts - Array of token account objects with owner and ATA public keys
 * @returns An array of transaction instructions to create missing ATAs
 */
export const ensureAtaAccounts = async (
  connection: anchor.web3.Connection,
  payer: PublicKey,
  mint: PublicKey,
  tokenAccounts: { owner: PublicKey; ata: PublicKey }[],
): Promise<anchor.web3.TransactionInstruction[]> => {
  const instructions: anchor.web3.TransactionInstruction[] = [];

  for (const tokenAccount of tokenAccounts) {
    const exists = await accountExists(connection, tokenAccount.ata);
    if (!exists) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          payer,
          tokenAccount.ata,
          tokenAccount.owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }
  }

  return instructions;
};
