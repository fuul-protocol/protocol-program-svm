import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram } from '../utils';
import { Network, GlobalRole, GlobalRoleAnchor } from '../types';

/**
 * Creates an instruction to grant a global role to an account.
 * Only admins can call this function.
 *
 * @param opts - The options for granting a global role
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.account - The account to grant the role to
 * @param opts.role - The global role to grant
 * @returns An array of transaction instructions
 */
export const grantGlobalRoleInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  account: PublicKey;
  role: GlobalRole;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .grantGlobalRole(opts.account, GlobalRoleAnchor[opts.role])
      .accounts({ authority: opts.authority })
      .instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to revoke a global role from an account.
 * Only admins can call this function.
 *
 * @param opts - The options for revoking a global role
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.account - The account to revoke the role from
 * @param opts.role - The global role to revoke
 * @returns An array of transaction instructions
 */
export const revokeGlobalRoleInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  account: PublicKey;
  role: GlobalRole;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .revokeGlobalRole(opts.account, GlobalRoleAnchor[opts.role])
      .accounts({ authority: opts.authority })
      .instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to renounce a global role.
 * The authority account renounces its own role.
 *
 * @param opts - The options for renouncing a global role
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account renouncing the role
 * @param opts.role - The global role to renounce
 * @returns An array of transaction instructions
 */
export const renounceGlobalRoleInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  role: GlobalRole;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .renounceGlobalRole(GlobalRoleAnchor[opts.role])
      .accounts({ authority: opts.authority })
      .instruction(),
  ];
  return instructions;
};
