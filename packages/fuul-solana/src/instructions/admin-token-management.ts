import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram } from '../utils';
import { Network, TokenType, TokenTypeAnchor } from '../types';

/**
 * Creates an instruction to add a new currency token to the global config.
 * Only admins can call this function.
 *
 * @param opts - The options for adding a currency token
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.tokenType - The type of token (Native, FungibleSpl, NonFungibleSpl)
 * @param opts.tokenMint - The token mint public key
 * @param opts.claimLimitPerCooldown - The claim limit per cooldown period (in smallest units)
 * @returns An array of transaction instructions
 */
export const addCurrencyTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  tokenType: TokenType;
  tokenMint: PublicKey;
  claimLimitPerCooldown: anchor.BN;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .addCurrencyToken(TokenTypeAnchor[opts.tokenType], opts.claimLimitPerCooldown)
      .accounts({ authority: opts.authority, tokenMint: opts.tokenMint })
      .instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to update a currency token's limit and active status.
 * Only admins can call this function.
 *
 * @param opts - The options for updating a currency token
 * @param opts.connection - The Solana connection
 * @param opts.env - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.tokenMint - The token mint public key
 * @param opts.claimLimitPerCooldown - Optional claim limit per cooldown period (in smallest units)
 * @param opts.isActive - Optional active status of the currency token
 * @returns An array of transaction instructions
 */
export const updateCurrencyTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  tokenMint: PublicKey;
  claimLimitPerCooldown?: anchor.BN;
  isActive?: boolean;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .updateCurrencyTokenLimit(opts.claimLimitPerCooldown ?? null, opts.isActive ?? null)
      .accounts({ authority: opts.authority, tokenMint: opts.tokenMint })
      .instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to remove a currency token from the global config.
 * Only admins can call this function.
 *
 * @param opts - The options for removing a currency token
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.tokenMint - The token mint public key
 * @returns An array of transaction instructions
 */
export const removeCurrencyTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  tokenMint: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .removeCurrencyToken()
      .accounts({ authority: opts.authority, tokenMint: opts.tokenMint })
      .instruction(),
  ];
  return instructions;
};
