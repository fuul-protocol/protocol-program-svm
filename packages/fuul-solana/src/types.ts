import * as anchor from '@coral-xyz/anchor';
import { FuulIdl } from './idls/fuul';
import FUUL_IDL from './idls/fuul.json';

/**
 * Type alias for Solana transaction instruction.
 */
export type TransactionInstruction = anchor.web3.TransactionInstruction;

// just to infer types, ignore provider
const program = new anchor.Program<FuulIdl>(FUUL_IDL, 1 as unknown as anchor.AnchorProvider)

/**
 * Type representing the global config account data.
 */
export type GlobalConfig = Awaited<ReturnType<typeof program.account.globalConfig.fetch>>

/**
 * Type representing the currency token account data.
 */
export type CurrencyToken = Awaited<ReturnType<typeof program.account.currencyToken.fetch>>

/**
 * Type representing the project account data.
 */
export type Project = Awaited<ReturnType<typeof program.account.project.fetch>>

/**
 * Type representing the project currency budget account data.
 */
export type ProjectCurrencyBudget = Awaited<ReturnType<typeof program.account.projectCurrencyBudget.fetch>>


/**
 * Type representing the project user account data.
 */
export type ProjectUser = Awaited<ReturnType<typeof program.account.projectUser.fetch>>

/**
 * Network environment enum.
 * Represents the different Solana cluster environments.
 */
export enum Network {
  /** Fogo mainnet cluster */
  FOGO_MAINNET = 'fogo-mainnet',
  /** Fogo testnet cluster */
  FOGO_TESTNET = 'fogo-testnet',
  /** Mainnet cluster */
  MAINNET = 'mainnet',
  /** Devnet cluster */
  DEVNET = 'devnet',
  /** Testnet cluster */
  TESTNET = 'testnet',
  /** Localhost cluster */
  LOCALHOST = 'localhost',  
}

/**
 * Token type enum.
 * Represents the different types of tokens supported by the protocol.
 */
export enum TokenType {
  /** Native SOL token */
  Native = 'native',
  /** Fungible SPL token */
  FungibleSpl = 'fungibleSpl',
  /** Non-fungible SPL token (NFT) */
  NonFungibleSpl = 'nonFungibleSpl',
}

/**
 * Mapping of TokenType enum values to Anchor-compatible format.
 * Used when calling program methods that require token type.
 */
export const TokenTypeAnchor: Record<TokenType, any> = {
  [TokenType.Native]: { native: {} },
  [TokenType.FungibleSpl]: { fungibleSpl: {} },
  [TokenType.NonFungibleSpl]: { nonFungibleSpl: {} },
}

/**
 * Global role enum.
 * Represents the different global roles that can be assigned to accounts.
 */
export enum GlobalRole {
  /** Administrator role with full permissions */
  Admin = 'admin',
  /** Pauser role for pausing the program */
  Pauser = 'pauser',
  /** Unpauser role for unpausing the program */
  Unpauser = 'unpauser',
  /** Signer role for signing claims */
  Signer = 'signer',
}

/**
 * Mapping of GlobalRole enum values to Anchor-compatible format.
 * Used when calling program methods that require global role.
 */
export const GlobalRoleAnchor: Record<GlobalRole, any> = {
  [GlobalRole.Admin]: { admin: {} },
  [GlobalRole.Pauser]: { pauser: {} },
  [GlobalRole.Unpauser]: { unpauser: {} },
  [GlobalRole.Signer]: { signer: {} },
}

/**
 * Project role enum.
 * Represents the different project-level roles that can be assigned to accounts.
 */
export enum ProjectRole {
  /** Project administrator role */
  Admin = 'admin',
}

/**
 * Mapping of ProjectRole enum values to Anchor-compatible format.
 * Used when calling program methods that require project role.
 */
export const ProjectRoleAnchor: Record<ProjectRole, any> = {
  [ProjectRole.Admin]: { admin: {} },
}

/**
 * Claim reason enum.
 * Represents the different reasons for a claim.
 */
export enum ClaimReason {
  /** Affiliate payout */
  AffiliatePayout = 'affiliatePayout',
  /** End user payout */
  EndUserPayout = 'endUserPayout',
}

/**
 * Mapping of ClaimReason enum values to Anchor-compatible format.
 * Used when calling program methods that require claim reason.
 */
export const ClaimReasonAnchor: Record<ClaimReason, any> = {
  [ClaimReason.AffiliatePayout]: { affiliatePayout: {} },
  [ClaimReason.EndUserPayout]: { endUserPayout: {} },
}