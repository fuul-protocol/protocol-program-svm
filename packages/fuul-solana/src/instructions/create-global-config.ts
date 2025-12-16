import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Network } from '../types';
import { getProgram } from '../utils';

/**
 * Creates an instruction to create the global config.
 * This is the first account that is created when the program is initialized.
 *
 * @param opts - The options for creating the global config
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account that will own the global config
 * @param opts.feeCollector - The fee collector public key
 * @returns An array of transaction instructions
 */
export const createGlobalConfigInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  feeCollector: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .createGlobalConfig(opts.feeCollector)
      .accounts({ authority: opts.authority })
      .instruction(),
  ];

  return instructions;
};
