import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Network } from '../types';
import { getProgram } from '../utils';
import { getGlobalConfigPda, getProjectPda } from '../pdas';
import { getGlobalConfig } from '../accounts';

/**
 * Creates an instruction to create a new project.
 *
 * @param opts - The options for creating a project
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account creating the project
 * @param opts.projectAdmin - The project admin public key
 * @param opts.metadataUri - The project metadata URI
 * @returns An array of transaction instructions
 */
export const createProjectInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectAdmin: PublicKey;
  metadataUri: string;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const globalConfig = await getGlobalConfig(opts);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);

  // Get the project PDA using the current nonce
  const projectNonce = globalConfig.projectNonce;
  const [projectPda] = getProjectPda(program.programId, projectNonce);

  const instructions = [
    await program.methods
      .createProject(opts.projectAdmin, opts.metadataUri)
      .accountsPartial({
        authority: opts.authority,
        globalConfig: globalConfigPda,
        project: projectPda,
      })
      .instruction(),
  ];

  return instructions;
};
