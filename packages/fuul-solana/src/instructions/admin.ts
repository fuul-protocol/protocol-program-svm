import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Network } from '../types';
import { getProgram } from '../utils';

/**
 * Creates an instruction to update the global config.
 * Only admins can call this function.
 *
 * @param opts - The options for updating the global config
 * @param opts.connection - The Solana connection
 * @param opts.env - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.claimCoolDown - Optional claim cooldown period in seconds
 * @param opts.requiredSignersForClaim - Optional number of required signers for a claim
 * @returns An array of transaction instructions
 */
export const updateGlobalConfigInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  claimCoolDown?: anchor.BN;
  requiredSignersForClaim?: number;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const instructions = [
    await program.methods
      .updateGlobalConfig(opts.claimCoolDown ?? null, opts.requiredSignersForClaim ?? null)
      .accounts({ authority: opts.authority })
      .instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to update the global config fees.
 * Only admins can call this function.
 *
 * @param opts - The options for updating the global config fees
 * @param opts.connection - The Solana connection
 * @param opts.env - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.feeCollector - Optional fee collector public key
 * @param opts.userNativeClaimFee - Optional user native claim fee in lamports
 * @param opts.projectClaimFee - Optional project claim fee in basis points (0-10000)
 * @param opts.removeFee - Optional remove fee in basis points (0-10000)
 * @returns An array of transaction instructions
 */
export const updateGlobalConfigFeesInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  feeCollector?: PublicKey;
  userNativeClaimFee?: anchor.BN;
  projectClaimFee?: number;
  removeFee?: number;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  const instructions = [
    await program.methods
      .updateGlobalConfigFees(
        opts.feeCollector ?? null,
        opts.userNativeClaimFee ?? null,
        opts.projectClaimFee ?? null,
        opts.removeFee ?? null,
      )
      .accounts({ authority: opts.authority })
      .instruction(),
  ];

  return instructions;
};

/**
 * Creates an instruction to pause the program.
 * Only pausers can call this function.
 *
 * @param opts - The options for pausing the program
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be pauser)
 * @returns An array of transaction instructions
 */
export const pauseProgramInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const instructions = [
    await program.methods.pauseProgram().accounts({ authority: opts.authority }).instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to unpause the program.
 * Only unpausers can call this function.
 *
 * @param opts - The options for unpausing the program
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be unpauser)
 * @returns An array of transaction instructions
 */
export const unpauseProgramInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const instructions = [
    await program.methods.unpauseProgram().accounts({ authority: opts.authority }).instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to add a wallet to the no claim fee whitelist.
 * Wallets in this whitelist are exempt from paying claim fees.
 * Only admins can call this function.
 *
 * @param opts - The options for adding to whitelist
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.account - The wallet public key to add to the whitelist
 * @returns An array of transaction instructions
 */
export const addNoClaimFeeWhitelistInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  account: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const instructions = [
    await program.methods
      .addNoClaimFeeWhitelist(opts.account)
      .accounts({ authority: opts.authority })
      .instruction(),
  ];
  return instructions;
};

/**
 * Creates an instruction to remove a wallet from the no claim fee whitelist.
 * Only admins can call this function.
 *
 * @param opts - The options for removing from whitelist
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.authority - The authority account (must be admin)
 * @param opts.account - The wallet public key to remove from the whitelist
 * @returns An array of transaction instructions
 */
export const removeNoClaimFeeWhitelistInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  account: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const instructions = [
    await program.methods
      .removeNoClaimFeeWhitelist(opts.account)
      .accounts({ authority: opts.authority })
      .instruction(),
  ];
  return instructions;
};
