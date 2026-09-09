import { Schema as BorshSchema, serialize } from 'borsh';
import {
  createEd25519Instruction,
  createEd25519InstructionWithMultipleSigners,
} from '../utils/ed25519';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenType, ClaimReason } from '../types';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// To enable sync usage of @noble/ed25519
ed25519.hashes.sha512 = sha512;

/**
 * Signature type containing the signature bytes and the signer's public key.
 */
export type Signature = {
  /** The signature bytes */
  signature: Uint8Array;
  /** The public key of the signer */
  signer: PublicKey;
};

/**
 * Base message class for creating and signing messages.
 * Provides functionality for signing messages and creating Ed25519 instructions.
 */
class Message<T> {
  data: T;
  domain: MessageDomain;
  schema: BorshSchema;

  /**
   * Creates a new Message instance.
   *
   * @param data - The message data
   * @param domain - The message domain
   * @param schema - The Borsh schema for serialization
   */
  constructor(data: T, domain: MessageDomain, schema: BorshSchema) {
    this.data = data;
    this.domain = domain;
    this.schema = schema;
  }

  /**
   * Signs the message with the provided signers.
   *
   * @param signers - Array of keypairs to sign the message
   * @returns Array of signatures with their corresponding signer public keys
   */
  sign(signers: Keypair[]): Signature[] {
    return signers.map((signer) => {
      return {
        // Solana's Keypair.secretKey is 64 bytes (32 secret + 32 public)
        // @noble/ed25519 expects only the 32-byte secret key
        signature: ed25519.sign(this.toBuffer(), signer.secretKey.slice(0, 32)),
        signer: signer.publicKey,
      };
    });
  }

  /**
   * Creates an Ed25519 instruction with a single signer.
   *
   * @param signature - The signature to verify
   * @returns A transaction instruction for Ed25519 signature verification
   */
  createEd25519Instruction(signature: Signature): TransactionInstruction {
    return createEd25519Instruction(signature, this.toBuffer());
  }

  /**
   * Creates an Ed25519 instruction with multiple signers.
   *
   * @param signatures - Array of signatures to verify
   * @returns A transaction instruction for Ed25519 signature verification with multiple signers
   */
  createEd25519InstructionWithMultipleSigners(signatures: Signature[]): TransactionInstruction {
    return createEd25519InstructionWithMultipleSigners(signatures, this.toBuffer());
  }

  /**
   * Serializes the message to a buffer using Borsh.
   *
   * @returns The serialized message as a buffer
   */
  toBuffer(): Buffer {
    return Buffer.from(serialize(this.schema, { data: this.data, domain: this.domain }));
  }
}

/**
 * Generic domain fields for signed messages.
 * Contains metadata about the message including program ID, version, nonce, and deadline.
 */
export class MessageDomain {
  /** The program ID as a 32-byte array */
  program_id: Uint8Array;
  /** The message version */
  version: number;
  /** The deadline timestamp (Unix timestamp in seconds) */
  deadline: bigint;

  /**
   * Borsh schema for MessageDomain serialization.
   */
  static schema: BorshSchema = {
    struct: {
      program_id: { array: { type: 'u8', len: 32 } },
      version: 'u8',
      deadline: 'i64',
    },
  };

  /**
   * Creates a new MessageDomain instance.
   *
   * @param fields - The domain fields
   * @param fields.programId - The program public key
   * @param fields.version - The message version
   * @param fields.deadline - The deadline timestamp (can be bigint, number, or string)
   */
  constructor(fields: {
    programId: PublicKey;
    version: number;
    deadline: bigint | number | string;
  }) {
    this.program_id = fields.programId.toBytes();
    this.version = fields.version;
    this.deadline = BigInt(fields.deadline);
  }
}

/**
 * Message data for claiming from project budget.
 * Contains the claim details including amount, project, recipient, token type, token mint, proof, and reason.
 */
export class ClaimMessageData {
  /** The amount to claim (in smallest units) */
  amount: bigint;
  /** The project public key as a 32-byte array */
  project: Uint8Array;
  /** The recipient public key as a 32-byte array */
  recipient: Uint8Array;
  /** The token type (0 = Native, 1 = FungibleSpl, 2 = NonFungibleSpl) */
  token_type: number;
  /** The token mint public key as a 32-byte array */
  token_mint: Uint8Array;
  /** The unique proof identifier for this claim */
  proof: Uint8Array;
  /** The claim reason (0 = AffiliatePayout, 1 = EndUserPayout) */
  reason: number;

  /**
   * Borsh schema for ClaimMessageData serialization.
   */
  static schema: BorshSchema = {
    struct: {
      amount: 'u64',
      project: { array: { type: 'u8', len: 32 } },
      recipient: { array: { type: 'u8', len: 32 } },
      token_type: 'u8',
      token_mint: { array: { type: 'u8', len: 32 } },
      proof: { array: { type: 'u8', len: 32 } },
      reason: 'u8',
    },
  };

  /**
   * Creates a new ClaimMessageData instance.
   *
   * @param fields - The message data fields
   * @param fields.amount - The amount to claim (can be bigint, number, or string)
   * @param fields.project - The project public key
   * @param fields.recipient - The recipient public key
   * @param fields.tokenType - The token type enum
   * @param fields.tokenMint - The token mint public key
   * @param fields.proof - The proof buffer (32 bytes)
   * @param fields.reason - The claim reason
   */
  constructor(fields: {
    amount: bigint | number | string;
    project: PublicKey;
    recipient: PublicKey;
    tokenType: TokenType;
    tokenMint: PublicKey;
    proof: Buffer;
    reason: ClaimReason;
  }) {
    this.amount = BigInt(fields.amount);
    this.project = fields.project.toBytes();
    this.recipient = fields.recipient.toBytes();
    this.token_type =
      fields.tokenType === TokenType.Native
        ? 0
        : fields.tokenType === TokenType.FungibleSpl
          ? 1
          : 2;
    this.token_mint = fields.tokenMint.toBytes();
    this.proof = fields.proof;
    this.reason = fields.reason === ClaimReason.AffiliatePayout ? 0 : 1;
  }
}

/**
 * Complete message for claiming from project budget.
 * Combines the message data with the domain information.
 */
export class ClaimMessage extends Message<ClaimMessageData> {
  /**
   * Borsh schema definition for ClaimMessage.
   */
  static schema: BorshSchema = {
    struct: {
      data: ClaimMessageData.schema,
      domain: MessageDomain.schema,
    },
  };

  /**
   * Creates a new ClaimMessage instance.
   *
   * @param fields - The message fields
   * @param fields.data - The claim message data
   * @param fields.domain - The message domain
   */
  constructor(fields: { data: ClaimMessageData; domain: MessageDomain }) {
    super(fields.data, fields.domain, ClaimMessage.schema);
  }
}
