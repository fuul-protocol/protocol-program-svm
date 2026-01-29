import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  getCurrencyToken,
  getProject,
  getGlobalConfig,
  getProjectCurrencyBudget,
  getProjectUser,
} from '../accounts';
import { ClaimMessage, ContractSdk, Signature } from '../common';
import { FuulIdl } from '../idls/fuul';
import {
  CurrencyToken,
  Project,
  GlobalConfig,
  Network,
  GlobalRole,
  TokenType,
  ProjectCurrencyBudget,
  ProjectRole,
  ProjectUser,
} from '../types';
import {
  createGlobalConfigInstruction,
  createProjectInstruction,
  updateGlobalConfigFeesInstruction,
  updateGlobalConfigInstruction,
  pauseProgramInstruction,
  unpauseProgramInstruction,
  addCurrencyTokenInstruction,
  updateCurrencyTokenInstruction,
  removeCurrencyTokenInstruction,
  grantGlobalRoleInstruction,
  revokeGlobalRoleInstruction,
  renounceGlobalRoleInstruction,
  claim,
  depositFungibleTokenInstruction,
  depositNonFungibleTokenInstruction,
  removeFungibleTokenInstruction,
  removeNonFungibleTokenInstruction,
  updateProjectFeesInstruction,
  grantProjectRoleInstruction,
  revokeProjectRoleInstruction,
  renounceProjectRoleInstruction,
  addNoClaimFeeWhitelistInstruction,
  removeNoClaimFeeWhitelistInstruction,
} from '../instructions';
import { FUUL_PROGRAM_IDL } from '../constants';

/**
 * Fuul SDK class for interacting with the Fuul Solana program.
 * Provides high-level methods for all program operations.
 */
export class FuulSdk extends ContractSdk<FuulIdl> {
  /**
   * Creates a new FuulSdk instance.
   *
   * @param connection - The Solana connection to the cluster
   * @param env - The network environment (mainnet, devnet, testnet, localhost)
   * @param wallet - Optional wallet to be associated for use with the program
   */
  constructor(connection: Connection, env: Network, programId?: PublicKey) {
    super(connection, env, FUUL_PROGRAM_IDL[env] as anchor.Idl, programId);
  }

  ////////////////////////////////// GETTERS //////////////////////////////////

  /**
   * Gets the global config account from the blockchain.
   *
   * @returns The global config account data, or null if not found
   */
  async getGlobalConfig(): Promise<GlobalConfig | null> {
    return getGlobalConfig({
      connection: this.getConnection(),
      programId: this.getProgramId(),
      network: this.getNetwork(),
    });
  }

  /**
   * Gets a project account from the blockchain.
   *
   * @param nonce - The project nonce used to derive the project PDA
   * @returns The project account data, or null if not found
   */
  async getProject(nonce: anchor.BN): Promise<Project | null> {
    return getProject({
      connection: this.getConnection(),
      programId: this.getProgramId(),
      network: this.getNetwork(),
      nonce,
    });
  }

  /**
   * Gets a currency token account from the blockchain.
   *
   * @param tokenAccount - The public key of the token mint account
   * @returns The currency token account data, or null if not found
   */
  async getCurrencyToken(tokenAccount: PublicKey): Promise<CurrencyToken | null> {
    return getCurrencyToken({
      connection: this.getConnection(),
      programId: this.getProgramId(),
      network: this.getNetwork(),
      tokenAccount,
    });
  }

  /**
   * Gets a project currency budget account from the blockchain.
   *
   * @param projectNonce - The project nonce used to derive the project PDA
   * @param currencyTokenMint - The public key of the currency token mint
   * @returns The project currency budget account data, or null if not found
   */
  async getProjectCurrencyBudget(
    projectNonce: anchor.BN,
    currencyTokenMint: PublicKey,
  ): Promise<ProjectCurrencyBudget | null> {
    return getProjectCurrencyBudget({
      connection: this.getConnection(),
      programId: this.getProgramId(),
      network: this.getNetwork(),
      projectNonce,
      currencyTokenMint,
    });
  }

  /**
   * Gets a project user account from the blockchain.
   *
   * @param projectNonce - The project nonce used to derive the project PDA
   * @param user - The public key of the user
   * @returns The project user account data, or null if not found
   */
  async getProjectUser(projectNonce: anchor.BN, user: PublicKey): Promise<ProjectUser | null> {
    return getProjectUser({
      connection: this.getConnection(),
      programId: this.getProgramId(),
      network: this.getNetwork(),
      projectNonce,
      user,
    });
  }

  ////////////////////////////////// ADMIN INTERFACE //////////////////////////////////

  /**
   * Creates an instruction to create the global config.
   * This is the first account that is created when the program is initialized.
   *
   * @param opts - The options for creating the global config
   * @param opts.authority - The authority account that will own the global config
   * @param opts.feeCollector - The fee collector public key
   * @param opts.initialSigner - The signer public key (the account that will have the Signer role)
   * @returns An array of transaction instructions
   */
  async createGlobalConfig(opts: {
    authority: PublicKey;
    feeCollector: PublicKey;
    initialSigner: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return createGlobalConfigInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to update the global config.
   * Only admins can call this function.
   *
   * @param opts - The options for updating the global config
   * @param opts.authority - The authority account (must be admin)
   * @param opts.claimCoolDown - Optional claim cooldown period in seconds
   * @param opts.requiredSignersForClaim - Optional number of required signers for a claim
   * @returns An array of transaction instructions
   */
  async updateGlobalConfig(opts: {
    authority: PublicKey;
    claimCoolDown?: anchor.BN;
    requiredSignersForClaim?: number;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return updateGlobalConfigInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to update the global config fees.
   * Only admins can call this function.
   *
   * @param opts - The options for updating the global config fees
   * @param opts.authority - The authority account (must be admin)
   * @param opts.feeCollector - Optional fee collector public key
   * @param opts.userNativeClaimFee - Optional user native claim fee in lamports
   * @param opts.projectClaimFee - Optional project claim fee in basis points (0-10000)
   * @param opts.removeFee - Optional remove fee in basis points (0-10000)
   * @returns An array of transaction instructions
   */
  async updateGlobalConfigFees(opts: {
    authority: PublicKey;
    feeCollector?: PublicKey;
    userNativeClaimFee?: anchor.BN;
    projectClaimFee?: number;
    removeFee?: number;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return updateGlobalConfigFeesInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to add a wallet to the no claim fee whitelist.
   * Wallets in this whitelist are exempt from paying claim fees.
   * Only admins can call this function.
   *
   * @param opts - The options for adding to whitelist
   * @param opts.authority - The authority account (must be admin)
   * @param opts.account - The wallet public key to add to the whitelist
   * @returns An array of transaction instructions
   */
  async addNoClaimFeeWhitelist(opts: {
    authority: PublicKey;
    account: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return addNoClaimFeeWhitelistInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to remove a wallet from the no claim fee whitelist.
   * Only admins can call this function.
   *
   * @param opts - The options for removing from whitelist
   * @param opts.authority - The authority account (must be admin)
   * @param opts.account - The wallet public key to remove from the whitelist
   * @returns An array of transaction instructions
   */
  async removeNoClaimFeeWhitelist(opts: {
    authority: PublicKey;
    account: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return removeNoClaimFeeWhitelistInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  ////////////////////////////////// ADMIN ROLES INTERFACE //////////////////////////////////

  /**
   * Creates an instruction to grant a global role to an account.
   * Only admins can call this function.
   *
   * @param opts - The options for granting a global role
   * @param opts.authority - The authority account (must be admin)
   * @param opts.account - The account to grant the role to
   * @param opts.role - The global role to grant
   * @returns An array of transaction instructions
   */
  async grantGlobalRole(opts: {
    authority: PublicKey;
    account: PublicKey;
    role: GlobalRole;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return grantGlobalRoleInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to revoke a global role from an account.
   * Only admins can call this function.
   *
   * @param opts - The options for revoking a global role
   * @param opts.authority - The authority account (must be admin)
   * @param opts.account - The account to revoke the role from
   * @param opts.role - The global role to revoke
   * @returns An array of transaction instructions
   */
  async revokeGlobalRole(opts: {
    authority: PublicKey;
    account: PublicKey;
    role: GlobalRole;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return revokeGlobalRoleInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to renounce a global role.
   * The authority account renounces its own role.
   *
   * @param opts - The options for renouncing a global role
   * @param opts.authority - The authority account renouncing the role
   * @param opts.role - The global role to renounce
   * @returns An array of transaction instructions
   */
  async renounceGlobalRole(opts: {
    authority: PublicKey;
    role: GlobalRole;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return renounceGlobalRoleInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  ////////////////////////////////// CONTROL INTERFACE //////////////////////////////////

  /**
   * Creates an instruction to pause the program.
   * Only pausers can call this function.
   *
   * @param opts - The options for pausing the program
   * @param opts.authority - The authority account (must be pauser)
   * @returns An array of transaction instructions
   */
  async pauseProgram(opts: {
    authority: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return pauseProgramInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to unpause the program.
   * Only unpausers can call this function.
   *
   * @param opts - The options for unpausing the program
   * @param opts.authority - The authority account (must be unpauser)
   * @returns An array of transaction instructions
   */
  async unpauseProgram(opts: {
    authority: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return unpauseProgramInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  ////////////////////////////////// ADMIN TOKEN MANAGEMENT INTERFACE //////////////////////////////////

  /**
   * Creates an instruction to add a new currency token to the global config.
   * Only admins can call this function.
   *
   * @param opts - The options for adding a currency token
   * @param opts.authority - The authority account (must be admin)
   * @param opts.tokenType - The type of token (Native, FungibleSpl, NonFungibleSpl)
   * @param opts.tokenMint - The token mint public key
   * @param opts.claimLimitPerCooldown - The claim limit per cooldown period (in smallest units)
   * @returns An array of transaction instructions
   */
  async addCurrencyToken(opts: {
    authority: PublicKey;
    tokenType: TokenType;
    tokenMint: PublicKey;
    claimLimitPerCooldown: anchor.BN;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return addCurrencyTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to update a currency token's limit and active status.
   * Only admins can call this function.
   *
   * @param opts - The options for updating a currency token
   * @param opts.authority - The authority account (must be admin)
   * @param opts.tokenMint - The token mint public key
   * @param opts.isActive - Optional active status of the currency token
   * @param opts.claimLimitPerCooldown - Optional claim limit per cooldown period (in smallest units)
   * @returns An array of transaction instructions
   */
  async updateCurrencyToken(opts: {
    authority: PublicKey;
    tokenMint: PublicKey;
    isActive?: boolean;
    claimLimitPerCooldown?: anchor.BN;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return updateCurrencyTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to remove a currency token from the global config.
   * Only admins can call this function.
   *
   * @param opts - The options for removing a currency token
   * @param opts.authority - The authority account (must be admin)
   * @param opts.tokenMint - The token mint public key
   * @returns An array of transaction instructions
   */
  async removeCurrencyToken(opts: {
    authority: PublicKey;
    tokenMint: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return removeCurrencyTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  ////////////////////////////////// PROJECT INTERFACE //////////////////////////////////

  /**
   * Creates an instruction to create a new project.
   *
   * @param opts - The options for creating a project
   * @param opts.authority - The authority account creating the project
   * @param opts.projectAdmin - The project admin public key
   * @param opts.metadataUri - The project metadata URI (optional, defaults to empty string)
   * @returns An array of transaction instructions
   */
  async createProject(opts: {
    authority: PublicKey;
    projectAdmin: PublicKey;
    metadataUri?: string;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return createProjectInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      authority: opts.authority,
      projectAdmin: opts.projectAdmin,
      metadataUri: opts.metadataUri ?? '',
    });
  }

  /**
   * Creates an instruction to update project fees.
   * Only global config authorities can call this function.
   *
   * @param opts - The options for updating project fees
   * @param opts.authority - The authority account (must be global config authority)
   * @param opts.projectNonce - The project nonce
   * @param opts.userNativeClaimFee - Optional user native claim fee in lamports
   * @param opts.projectClaimFee - Optional project claim fee in basis points (0-10000)
   * @param opts.removeFee - Optional remove fee in basis points (0-10000)
   * @returns An array of transaction instructions
   */
  async updateProjectFees(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    userNativeClaimFee?: anchor.BN;
    projectClaimFee?: number;
    removeFee?: number;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return updateProjectFeesInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  ////////////////////////////////// PROJECT ROLES INTERFACE //////////////////////////////////
  /**
   * Creates an instruction to grant a project role to an account.
   * Only project admins can call this function.
   *
   * @param opts - The options for granting a project role
   * @param opts.authority - The authority account (must be project admin)
   * @param opts.account - The account to grant the role to
   * @param opts.projectNonce - The project nonce
   * @param opts.role - The project role to grant
   * @returns An array of transaction instructions
   */
  async grantProjectRole(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    account: PublicKey;
    role: ProjectRole;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return grantProjectRoleInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to revoke a project role from an account.
   * Only project admins can call this function.
   *
   * @param opts - The options for revoking a project role
   * @param opts.authority - The authority account (must be project admin)
   * @param opts.projectNonce - The project nonce
   * @param opts.account - The account to revoke the role from
   * @param opts.role - The project role to revoke
   * @returns An array of transaction instructions
   */
  async revokeProjectRole(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    account: PublicKey;
    role: ProjectRole;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return revokeProjectRoleInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to renounce a project role.
   * The authority account renounces its own role.
   *
   * @param opts - The options for renouncing a project role
   * @param opts.authority - The authority account renouncing the role
   * @param opts.projectNonce - The project nonce
   * @param opts.role - The project role to renounce
   * @returns An array of transaction instructions
   */
  async renounceProjectRole(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    role: ProjectRole;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return renounceProjectRoleInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  ////////////////////////////////// PROJECT BUDGET INTERFACE //////////////////////////////////

  /**
   * Creates an instruction to deposit a fungible token into a project.
   * Only project admins can call this function.
   *
   * @param opts - The options for depositing a fungible token
   * @param opts.authority - The authority account (must be project admin)
   * @param opts.projectNonce - The project nonce
   * @param opts.tokenMint - The token mint public key (use PublicKey.default for native SOL)
   * @param opts.amount - The amount to deposit in smallest units
   * @returns An array of transaction instructions (includes ATA creation instructions for SPL tokens if needed)
   */
  async depositFungibleToken(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    tokenMint: PublicKey;
    amount: anchor.BN;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return depositFungibleTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to deposit a single NFT into a project.
   * Only project admins can call this function.
   *
   * @param opts - The options for depositing an NFT
   * @param opts.authority - The authority account (must be project admin)
   * @param opts.projectNonce - The project nonce
   * @param opts.tokenMint - The NFT mint public key (must have 0 decimals)
   * @returns An array of transaction instructions (includes ATA creation instructions if needed)
   */
  async depositNonFungibleToken(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    tokenMint: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return depositNonFungibleTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates an instruction to remove a single NFT from a project.
   * Only project admins can call this function.
   *
   * @param opts - The options for removing an NFT
   * @param opts.authority - The authority account (must be project admin)
   * @param opts.projectNonce - The project nonce
   * @param opts.tokenMint - The NFT mint public key
   * @returns An array of transaction instructions (includes ATA creation instructions if needed)
   */
  async removeNonFungibleToken(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    tokenMint: PublicKey;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return removeNonFungibleTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgram().programId,
      ...opts,
    });
  }

  /**
   * Creates an instruction to remove a fungible token from a project.
   * Only project admins can call this function.
   * A remove fee is charged when removing tokens.
   *
   * @param opts - The options for removing a fungible token
   * @param opts.authority - The authority account (must be project admin)
   * @param opts.projectNonce - The project nonce
   * @param opts.tokenMint - The token mint public key (use PublicKey.default for native SOL)
   * @param opts.amount - The amount to remove in smallest units
   * @returns An array of transaction instructions (includes ATA creation instructions for SPL tokens if needed)
   */
  async removeFungibleToken(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    tokenMint: PublicKey;
    amount: anchor.BN;
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return removeFungibleTokenInstruction({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }

  /**
   * Creates instructions to claim tokens from a project budget.
   * Requires a signed message with valid signatures from authorized signers.
   * The claim message must include a nonce for replay protection.
   *
   * @param opts - Options for claiming from the project budget
   * @param opts.authority - The authority account executing the claim (should match recipient in message)
   * @param opts.projectNonce - The project nonce (unique identifier for the project)
   * @param opts.message - The signed ClaimMessage instance (must include matching domain and data)
   * @param opts.signatures - Array of Ed25519 signatures from authorized signers
   * @returns Transaction instructions for processing the claim (includes Ed25519 check and ATA creation if needed)
   */
  async claim(opts: {
    authority: PublicKey;
    projectNonce: anchor.BN;
    message: ClaimMessage;
    signatures: Signature[];
  }): Promise<anchor.web3.TransactionInstruction[]> {
    return claim({
      connection: this.getConnection(),
      network: this.getNetwork(),
      programId: this.getProgramId(),
      ...opts,
    });
  }
}
