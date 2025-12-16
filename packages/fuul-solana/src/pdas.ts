import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import {
  CURRENCY_TOKEN_TAG,
  PROJECT_TAG,
  GLOBAL_CONFIG_TAG,
  PROJECT_CURRENCY_BUDGET_TAG,
  PROJECT_ATTRIBUTION_TAG,
  PROJECT_USER_TAG,
} from './constants';

/**
 * Get the global config program-derived address (PDA).
 *
 * @param programId - The Fuul program ID
 * @returns A tuple containing the global config PDA and the bump seed
 */
export const getGlobalConfigPda = (programId: PublicKey) => {
  const globalConfigPda = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_CONFIG_TAG)],
    programId,
  );
  return globalConfigPda;
};

/**
 * Get the Fuul project program-derived address (PDA).
 *
 * @param programId - The Fuul program ID
 * @param nonce - The project nonce (converted to 8-byte little-endian buffer)
 * @returns A tuple containing the project PDA and the bump seed
 */
export const getProjectPda = (programId: PublicKey, nonce: anchor.BN) => {
  // Convert number to 8-byte Buffer in little-endian
  const nonceBuffer = Buffer.alloc(8);
  nonceBuffer.writeBigUInt64LE(BigInt(nonce.toString()));

  const fuulProjectPda = PublicKey.findProgramAddressSync(
    [Buffer.from(PROJECT_TAG), nonceBuffer],
    programId,
  );
  return fuulProjectPda;
};

/**
 * Get the currency token program-derived address (PDA).
 *
 * @param programId - The Fuul program ID
 * @param tokenAccount - The token mint public key
 * @returns A tuple containing the currency token PDA and the bump seed
 */
export const getCurrencyTokenPda = (programId: PublicKey, tokenAccount: PublicKey) => {
  const currencyTokenPda = PublicKey.findProgramAddressSync(
    [Buffer.from(CURRENCY_TOKEN_TAG), tokenAccount.toBuffer()],
    programId,
  );
  return currencyTokenPda;
};

/**
 * Get the project currency budget program-derived address (PDA).
 *
 * @param programId - The Fuul program ID
 * @param project - The project public key
 * @param currencyToken - The currency token public key
 * @returns A tuple containing the project currency budget PDA and the bump seed
 */
export const getProjectCurrencyBudgetPda = (
  programId: PublicKey,
  project: PublicKey,
  currencyToken: PublicKey,
) => {
  const projectCurrencyBudgetPda = PublicKey.findProgramAddressSync(
    [Buffer.from(PROJECT_CURRENCY_BUDGET_TAG), project.toBuffer(), currencyToken.toBuffer()],
    programId,
  );
  return projectCurrencyBudgetPda;
};

/**
 * Get the project attribution program-derived address (PDA).
 * This PDA is used as a nullifier for claim replay protection.
 *
 * @param programId - The Fuul program ID
 * @param project - The project public key
 * @param proof - The proof buffer (32 bytes) used as seed
 * @returns A tuple containing the project attribution PDA and the bump seed
 */
export const getProjectAttributionPda = (
  programId: PublicKey,
  project: PublicKey,
  proof: Buffer,
) => {
  const projectAttributionPda = PublicKey.findProgramAddressSync(
    [Buffer.from(PROJECT_ATTRIBUTION_TAG), project.toBuffer(), proof],
    programId,
  );
  return projectAttributionPda;
};

/**
 * Get the project user program-derived address (PDA).
 * This PDA is used to track user stats per project.
 *
 * @param programId - The Fuul program ID
 * @param project - The project public key
 * @param user - The user public key
 * @returns A tuple containing the project user PDA and the bump seed
 */
export const getProjectUserPda = (programId: PublicKey, project: PublicKey, user: PublicKey) => {
  const projectUserPda = PublicKey.findProgramAddressSync(
    [Buffer.from(PROJECT_USER_TAG), project.toBuffer(), user.toBuffer()],
    programId,
  );
  return projectUserPda;
};
