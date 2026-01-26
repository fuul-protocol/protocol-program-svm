import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import {
  getCurrencyTokenPda,
  getProjectPda,
  getGlobalConfigPda,
  getProjectCurrencyBudgetPda,
  getProjectUserPda,
} from './pdas';
import {
  CurrencyToken,
  GlobalConfig,
  Network,
  Project,
  ProjectCurrencyBudget,
  ProjectUser,
} from './types';
import { getProgram } from './utils';

/**
 * Get the global config account from the blockchain.
 *
 * @param opts - The options for getting the global config
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment (mainnet, devnet, testnet, localhost)
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @returns The global config account data
 * @throws {Error} If the global config account is not found
 */
export const getGlobalConfig = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
}): Promise<GlobalConfig> => {
  const program = getProgram(opts);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);

  try {
    const globalConfig = await program.account.globalConfig.fetch(globalConfigPda);
    return globalConfig;
  } catch (err: any) {
    // Only swallow the "account does not exist" error
    if (typeof err.message === 'string' && err.message.includes('Could not find')) {
      throw new Error('Global config not found');
    }
    throw err; // rethrow other unexpected errors
  }
};

/**
 * Get the currency token account from the blockchain.
 *
 * @param connection - The Solana connection
 * @param opts.network - The network environment (mainnet, devnet, testnet, localhost)
 * @param opts.tokenAccount - The public key of the token mint account
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @returns The currency token account data
 * @throws {Error} If the currency token account is not found
 */
export const getCurrencyToken = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  tokenAccount: PublicKey;
  programId?: PublicKey;
}): Promise<CurrencyToken> => {
  const program = getProgram(opts);
  const [currencyTokenPda] = getCurrencyTokenPda(program.programId, opts.tokenAccount);

  try {
    const currencyToken = await program.account.currencyToken.fetch(currencyTokenPda);
    return currencyToken;
  } catch (err: any) {
    // Only swallow the "account does not exist" error
    if (typeof err.message === 'string' && err.message.includes('Could not find')) {
      throw new Error('Currency token not found');
    }
    throw err; // rethrow other unexpected errors
  }
};

/**
 * Get the fuul project account from the blockchain.
 *
 * @param opts - The options for getting the project
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment (mainnet, devnet, testnet, localhost)
 * @param opts.nonce - The project nonce used to derive the project PDA
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @returns The project account data
 * @throws {Error} If the project account is not found
 */
export const getProject = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  nonce: anchor.BN;
  programId?: PublicKey;
}): Promise<Project> => {
  const program = getProgram(opts);
  const [fuulProjectPda] = getProjectPda(program.programId, opts.nonce);

  try {
    const fuulProject = await program.account.project.fetch(fuulProjectPda);
    return fuulProject;
  } catch (err: any) {
    // Only swallow the "account does not exist" error
    if (typeof err.message === 'string' && err.message.includes('Could not find')) {
      throw new Error('Project not found');
    }
    throw err; // rethrow other unexpected errors
  }
};

/**
 * Get the project currency budget account from the blockchain.
 *
 * @param opts - The options for getting the project currency budget
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment (mainnet, devnet, testnet, localhost)
 * @param opts.projectNonce - The project nonce used to derive the project PDA
 * @param opts.currencyTokenMint - The public key of the currency token mint
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @returns The project currency budget account data
 * @throws {Error} If the project currency budget account is not found
 */
export const getProjectCurrencyBudget = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  projectNonce: anchor.BN;
  currencyTokenMint: PublicKey;
  programId?: PublicKey;
}): Promise<ProjectCurrencyBudget> => {
  const program = getProgram(opts);
  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);
  const [currencyTokenPda] = getCurrencyTokenPda(program.programId, opts.currencyTokenMint);
  const [projectCurrencyBudgetPda] = getProjectCurrencyBudgetPda(
    program.programId,
    projectPda,
    currencyTokenPda,
  );

  try {
    const projectCurrencyBudget =
      await program.account.projectCurrencyBudget.fetch(projectCurrencyBudgetPda);
    return projectCurrencyBudget;
  } catch (err: any) {
    // Only swallow the "account does not exist" error
    if (typeof err.message === 'string' && err.message.includes('Could not find')) {
      throw new Error('Project currency budget not found');
    }
    throw err; // rethrow other unexpected errors
  }
};

/**
 * Get the project user account from the blockchain.
 *
 * @param opts - The options for getting the project user
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment (mainnet, devnet, testnet, localhost)
 * @param opts.projectNonce - The project nonce used to derive the project PDA
 * @param opts.user - The public key of the user
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @returns The project user account data
 * @throws {Error} If the project user account is not found
 */
export const getProjectUser = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  projectNonce: anchor.BN;
  user: PublicKey;
  programId?: PublicKey;
}): Promise<ProjectUser> => {
  const program = getProgram(opts);

  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);
  const [projectUserPda] = getProjectUserPda(program.programId, projectPda, opts.user);

  try {
    const projectUser = await program.account.projectUser.fetch(projectUserPda);
    return projectUser;
  } catch (err: any) {
    // Only swallow the "account does not exist" error
    if (typeof err.message === 'string' && err.message.includes('Could not find')) {
      throw new Error('Project user not found');
    }
    throw err; // rethrow other unexpected errors
  }
};
