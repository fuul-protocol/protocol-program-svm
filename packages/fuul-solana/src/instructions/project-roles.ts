import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram } from '../utils';
import { Network, ProjectRole, ProjectRoleAnchor } from '../types';

/**
 * Creates an instruction to grant a project role to an account.
 * Only project admins can call this function.
 *
 * @param opts - The options for granting a project role
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account (must be project admin)
 * @param opts.account - The account to grant the role to
 * @param opts.projectNonce - The project nonce
 * @param opts.role - The project role to grant
 * @returns An array of transaction instructions
 */
export const grantProjectRoleInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  account: PublicKey;
  projectNonce: anchor.BN;
  role: ProjectRole;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .grantProjectRole(opts.projectNonce, opts.account, ProjectRoleAnchor[opts.role])
      .accounts({ authority: opts.authority })
      .instruction(),
  ];

  return instructions;
};

/**
 * Creates an instruction to revoke a project role from an account.
 * Only project admins can call this function.
 *
 * @param opts - The options for revoking a project role
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account (must be project admin)
 * @param opts.projectNonce - The project nonce
 * @param opts.account - The account to revoke the role from
 * @param opts.role - The project role to revoke
 * @returns An array of transaction instructions
 */
export const revokeProjectRoleInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  account: PublicKey;
  role: ProjectRole;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .revokeProjectRole(opts.projectNonce, opts.account, ProjectRoleAnchor[opts.role])
      .accounts({ authority: opts.authority })
      .instruction(),
  ];

  return instructions;
};

/**
 * Creates an instruction to renounce a project role.
 * The authority account renounces its own role.
 *
 * @param opts - The options for renouncing a project role
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account renouncing the role
 * @param opts.projectNonce - The project nonce
 * @param opts.role - The project role to renounce
 * @returns An array of transaction instructions
 */
export const renounceProjectRoleInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  role: ProjectRole;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .renounceProjectRole(opts.projectNonce, ProjectRoleAnchor[opts.role])
      .accounts({ authority: opts.authority })
      .instruction(),
  ];

  return instructions;
};
