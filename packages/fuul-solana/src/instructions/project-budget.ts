import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Network } from '../types';
import { ensureAtaAccounts, getProgram } from '../utils';
import {
  getCurrencyTokenPda,
  getGlobalConfigPda,
  getProjectCurrencyBudgetPda,
  getProjectPda,
  getProjectAttributionPda,
  getProjectUserPda,
} from '../pdas';
import { getGlobalConfig } from '../accounts';
import { ClaimMessage, Signature } from '../common';
import { keccak_256 } from '@noble/hashes/sha3';

/**
 * Creates an instruction to deposit a fungible token into a project.
 * Only project admins can call this function.
 *
 * @param opts - The options for depositing a fungible token
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account (must be project admin)
 * @param opts.projectNonce - The project nonce
 * @param opts.tokenMint - The token mint public key (use PublicKey.default for native SOL)
 * @param opts.amount - The amount to deposit in smallest units
 * @returns An array of transaction instructions (includes ATA creation instructions for SPL tokens if needed)
 */
export const depositFungibleTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  tokenMint: PublicKey;
  amount: anchor.BN;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);
  const [currencyTokenPda] = getCurrencyTokenPda(program.programId, opts.tokenMint);
  const [projectCurrencyBudgetPda] = getProjectCurrencyBudgetPda(
    program.programId,
    projectPda,
    currencyTokenPda,
  );

  const isNative = opts.tokenMint.equals(PublicKey.default);
  const authorityAta = isNative
    ? null
    : getAssociatedTokenAddressSync(opts.tokenMint, opts.authority, true);
  const projectAta = isNative
    ? null
    : getAssociatedTokenAddressSync(opts.tokenMint, projectPda, true);

  const instructions = [
    await program.methods
      .depositFungibleToken(opts.projectNonce, opts.amount)
      .accountsPartial({
        authority: opts.authority,
        project: projectPda,
        currencyToken: currencyTokenPda,
        tokenMint: opts.tokenMint,
        projectCurrencyBudget: projectCurrencyBudgetPda,
        authorityAta: authorityAta,
        projectAta: projectAta,
      })
      .instruction(),
  ];

  // if is not native we need more instructions to ensure ata accounts are created if not already
  if (!isNative) {
    const tokenAccounts = [
      { owner: opts.authority, ata: authorityAta! },
      { owner: projectPda, ata: projectAta! },
    ];
    instructions.unshift(
      ...(await ensureAtaAccounts(opts.connection, opts.authority, opts.tokenMint, tokenAccounts)),
    );
  }

  return instructions;
};

/**
 * Creates an instruction to deposit a single NFT into a project.
 * Only project admins can call this function.
 *
 * @param opts - The options for depositing an NFT
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account (must be project admin)
 * @param opts.projectNonce - The project nonce
 * @param opts.tokenMint - The NFT mint public key (must have 0 decimals)
 * @returns An array of transaction instructions (includes ATA creation instructions if needed)
 */
export const depositNonFungibleTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  tokenMint: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);

  const authorityAta = getAssociatedTokenAddressSync(opts.tokenMint, opts.authority, true);
  const projectAta = getAssociatedTokenAddressSync(opts.tokenMint, projectPda, true);

  const instructions = [
    await program.methods
      .depositNonFungibleToken(opts.projectNonce)
      .accountsPartial({
        authority: opts.authority,
        project: projectPda,
        authorityAta: authorityAta,
        projectAta: projectAta,
        tokenMint: opts.tokenMint,
      })
      .instruction(),
  ];

  // if is not native we need more instructions to ensure ata accounts are created if not already
  const tokenAccounts = [
    { owner: opts.authority, ata: authorityAta },
    { owner: projectPda, ata: projectAta },
  ];
  instructions.unshift(
    ...(await ensureAtaAccounts(opts.connection, opts.authority, opts.tokenMint, tokenAccounts)),
  );

  return instructions;
};

/**
 * Creates an instruction to remove a single NFT from a project.
 * Only project admins can call this function.
 *
 * @param opts - The options for removing an NFT
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.env - The network environment
 * @param opts.authority - The authority account (must be project admin)
 * @param opts.projectNonce - The project nonce
 * @param opts.tokenMint - The NFT mint public key
 * @returns An array of transaction instructions (includes ATA creation instructions if needed)
 */
export const removeNonFungibleTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  tokenMint: PublicKey;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);
  const authorityAta = getAssociatedTokenAddressSync(opts.tokenMint, opts.authority, true);
  const projectAta = getAssociatedTokenAddressSync(opts.tokenMint, projectPda, true);

  const instructions = [
    await program.methods
      .removeNonFungibleToken(opts.projectNonce)
      .accountsPartial({
        authority: opts.authority,
        project: projectPda,
        authorityAta: authorityAta,
        projectAta: projectAta,
        tokenMint: opts.tokenMint,
      })
      .instruction(),
  ];

  // if is not native we need more instructions to ensure ata accounts are created if not already
  const tokenAccounts = [{ owner: opts.authority, ata: authorityAta }];
  instructions.unshift(
    ...(await ensureAtaAccounts(opts.connection, opts.authority, opts.tokenMint, tokenAccounts)),
  );

  return instructions;
};

/**
 * Creates an instruction to remove a fungible token from a project.
 * Only project admins can call this function.
 * A remove fee is charged when removing tokens.
 *
 * @param opts - The options for removing a fungible token
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account (must be project admin)
 * @param opts.projectNonce - The project nonce
 * @param opts.tokenMint - The token mint public key (use PublicKey.default for native SOL)
 * @param opts.amount - The amount to remove in smallest units
 * @returns An array of transaction instructions (includes ATA creation instructions for SPL tokens if needed)
 */
export const removeFungibleTokenInstruction = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  tokenMint: PublicKey;
  amount: anchor.BN;
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);

  // Get PDAs
  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);
  const [currencyTokenPda] = getCurrencyTokenPda(program.programId, opts.tokenMint);
  const [projectCurrencyBudgetPda] = getProjectCurrencyBudgetPda(
    program.programId,
    projectPda,
    currencyTokenPda,
  );

  // Get associated token addresses
  const isNative = opts.tokenMint.equals(PublicKey.default);
  const globalConfig = await getGlobalConfig(opts);
  const feeCollector = globalConfig.feeManagement.feeCollector;
  const protocolFeeCollectorAta = isNative
    ? null
    : getAssociatedTokenAddressSync(opts.tokenMint, feeCollector, true);
  const authorityAta = isNative
    ? null
    : getAssociatedTokenAddressSync(opts.tokenMint, opts.authority, true);
  const projectAta = isNative
    ? null
    : getAssociatedTokenAddressSync(opts.tokenMint, projectPda, true);

  const instructions = [
    await program.methods
      .removeFungibleToken(opts.projectNonce, opts.amount)
      .accountsPartial({
        globalConfig: globalConfigPda,
        tokenMint: opts.tokenMint,
        feeCollector: feeCollector,
        protocolFeeCollectorAta: protocolFeeCollectorAta,
        authority: opts.authority,
        authorityAta: authorityAta,
        project: projectPda,
        projectAta: projectAta,
        currencyToken: currencyTokenPda,
        projectCurrencyBudget: projectCurrencyBudgetPda,
      })
      .instruction(),
  ];

  // if is not native we need more instructions to ensure ata accounts are created if not already
  if (!isNative) {
    const tokenAccounts = [
      { owner: feeCollector, ata: protocolFeeCollectorAta! },
      { owner: opts.authority, ata: authorityAta! },
      { owner: projectPda, ata: projectAta! },
    ];
    instructions.unshift(
      ...(await ensureAtaAccounts(opts.connection, opts.authority, opts.tokenMint, tokenAccounts)),
    );
  }

  return instructions;
};

/**
 * Creates an instruction to claim tokens from a project budget.
 * Requires a signed message with valid signatures from authorized signers.
 * The message must include a nonce for replay protection.
 *
 * @param opts - The options for claiming from project budget
 * @param opts.programId - The program ID (optional, defaults to the configured in constants)
 * @param opts.connection - The Solana connection
 * @param opts.network - The network environment
 * @param opts.authority - The authority account (the recipient)
 * @param opts.projectNonce - The project nonce
 * @param opts.tokenMint - The token mint public key (use PublicKey.default for native SOL)
 * @param opts.recipient - The recipient public key
 * @param opts.message - The signed claim message
 * @param opts.signatures - Array of signatures from authorized signers. A single transaction can hold up to 3 signatures for native claims and 1 for spl.
 * @param opts.proofWithoutProject - The proof without project pubkey (used to verify proof on-chain)
 * @returns An array of transaction instructions (includes Ed25519 verification instruction and ATA creation if needed)
 */
export const claim = async (opts: {
  connection: anchor.web3.Connection;
  network: Network;
  programId?: PublicKey;
  authority: PublicKey;
  projectNonce: anchor.BN;
  message: ClaimMessage;
  signatures: Signature[];
}): Promise<anchor.web3.TransactionInstruction[]> => {
  const program = getProgram(opts);
  const [projectPda] = getProjectPda(program.programId, opts.projectNonce);
  const [globalConfigPda] = getGlobalConfigPda(program.programId);
  const [currencyTokenPda] = getCurrencyTokenPda(
    program.programId,
    new PublicKey(opts.message.data.token_mint),
  );
  const [projectCurrencyBudgetPda] = getProjectCurrencyBudgetPda(
    program.programId,
    projectPda,
    currencyTokenPda,
  );
  const proof = Buffer.from(
    keccak_256(Buffer.concat([opts.message.data.proof_without_project, projectPda.toBuffer()])),
  );
  const [projectAttributionPda] = getProjectAttributionPda(program.programId, projectPda, proof);
  const [projectUserPda] = getProjectUserPda(
    program.programId,
    projectPda,
    new PublicKey(opts.message.data.recipient),
  );

  const globalConfig = await getGlobalConfig(opts);
  const feeCollector = globalConfig.feeManagement.feeCollector;

  // Get associated token addresses only for SPL tokens (not native)
  const isNative = new PublicKey(opts.message.data.token_mint).equals(PublicKey.default);
  const projectAta = isNative
    ? null
    : getAssociatedTokenAddressSync(new PublicKey(opts.message.data.token_mint), projectPda, true);
  const recipientAta = isNative
    ? null
    : getAssociatedTokenAddressSync(
        new PublicKey(opts.message.data.token_mint),
        new PublicKey(opts.message.data.recipient),
        true,
      );
  const feeCollectorAta = isNative
    ? null
    : getAssociatedTokenAddressSync(
        new PublicKey(opts.message.data.token_mint),
        feeCollector,
        true,
      );

  const instructions = [
    opts.message.createEd25519InstructionWithMultipleSigners(opts.signatures),
    await program.methods
      .claim(
        opts.projectNonce,
        Array.from(proof) as number[],
        Array.from(opts.message.data.proof_without_project) as number[],
      )
      .accountsPartial({
        authority: opts.authority,
        project: projectPda,
        globalConfig: globalConfigPda,
        tokenMint: new PublicKey(opts.message.data.token_mint),
        feeCollector: feeCollector,
        feeCollectorAta: feeCollectorAta,
        currencyToken: currencyTokenPda,
        projectAta: projectAta,
        recipient: new PublicKey(opts.message.data.recipient),
        recipientAta: recipientAta,
        projectCurrencyBudget: projectCurrencyBudgetPda,
        projectAttribution: projectAttributionPda,
        projectUser: projectUserPda,
        instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .instruction(),
  ];

  // if is not native we need more instructions to ensure ata accounts are created if not already
  if (!isNative) {
    const tokenAccounts = [
      { owner: new PublicKey(opts.message.data.recipient), ata: recipientAta! },
      { owner: feeCollector, ata: feeCollectorAta! },
    ];
    instructions.unshift(
      ...(await ensureAtaAccounts(
        opts.connection,
        opts.authority,
        new PublicKey(opts.message.data.token_mint),
        tokenAccounts,
      )),
    );
  }

  return instructions;
};
