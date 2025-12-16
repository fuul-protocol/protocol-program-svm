import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Network } from '../types';
import { getProgram } from '../utils';

/**
 * Creates an instruction to update project fees.
 * Only global config authorities can call this function.
 *
 * @param opts - The options for updating project fees
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be global config authority)
 * @param opts.projectNonce - The project nonce
 * @param opts.userNativeClaimFee - Optional user native claim fee in lamports
 * @param opts.projectClaimFee - Optional project claim fee in basis points (0-10000)
 * @param opts.removeFee - Optional remove fee in basis points (0-10000)
 * @returns An array of transaction instructions
 */
export const updateProjectFeesInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  userNativeClaimFee?: anchor.BN;
  projectClaimFee?: number;
  removeFee?: number;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .updateProjectFees(
        opts.projectNonce,
        opts.userNativeClaimFee ?? null,
        opts.projectClaimFee ?? null,
        opts.removeFee ?? null,
      )
      .accounts({ authority: opts.authority })
      .instruction(),
  ];

  return instructions;
};
