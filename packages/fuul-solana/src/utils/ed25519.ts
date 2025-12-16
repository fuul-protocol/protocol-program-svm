import { TransactionInstruction, Ed25519Program, PublicKey } from '@solana/web3.js';
import { Signature } from '../common/messages';

/**
 * Creates an Ed25519 instruction with a single signer.
 * This instruction verifies an Ed25519 signature against a message.
 * Format: [public_key: u8[32], message: u8[N], signature: u8[64]]
 *
 * @param signature - The signature object containing the signature bytes and signer public key
 * @param message - The message buffer that was signed
 * @returns A transaction instruction for Ed25519 signature verification
 */
export function createEd25519Instruction(
  signature: Signature,
  message: Buffer,
): TransactionInstruction {
  // Use the helper to build the instruction
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: signature.signer.toBytes(),
    message,
    signature: signature.signature,
  });
}

/**
 * Creates an Ed25519 instruction with multiple signatures for the same message.
 * This instruction verifies multiple Ed25519 signatures against a single message.
 * Format: [count: u8, padding: u8, ...signature_entries: 14 bytes each, ...signatures, ...pubkeys, message]
 * Each signature entry: [sig_offset: u16, sig_ix_idx: u16, pk_offset: u16, pk_ix_idx: u16, msg_offset: u16, msg_size: u16, msg_ix_idx: u16]
 *
 * @param signatures - Array of signature objects, each containing signature bytes and signer public key
 * @param message - The message buffer that was signed (same for all signatures)
 * @returns A transaction instruction for Ed25519 signature verification with multiple signers
 * @throws {Error} If no signers are provided or if more than 255 signers are provided
 */
export function createEd25519InstructionWithMultipleSigners(
  signatures: { signature: Uint8Array; signer: PublicKey }[],
  message: Buffer,
): TransactionInstruction {
  if (signatures.length === 0) {
    throw new Error('At least one signer is required');
  }
  if (signatures.length > 255) {
    throw new Error('Maximum 255 signers supported');
  }

  const SIG_LEN = 64;
  const PUBKEY_LEN = 32;
  const HEADER_LEN = 2; // count + padding
  const SIG_ENTRY_LEN = 14; // 7 u16 values per signature entry

  // Calculate the header length: 2 bytes (count + padding) + 14 bytes per signature entry
  const minHeaderLen = HEADER_LEN + signatures.length * SIG_ENTRY_LEN;

  // Calculate offsets for signatures and public keys
  // Layout: [header][sig1][sig2]...[sigN][pk1][pk2]...[pkN][message]
  const signatureOffsets: number[] = [];
  const publicKeyOffsets: number[] = [];

  let offset = minHeaderLen;

  // All signatures come first
  for (let i = 0; i < signatures.length; i++) {
    signatureOffsets.push(offset);
    offset += SIG_LEN;
  }

  // Then all public keys
  for (let i = 0; i < signatures.length; i++) {
    publicKeyOffsets.push(offset);
    offset += PUBKEY_LEN;
  }

  // Message comes last (same for all signatures)
  const messageOffset = offset;

  // Build the instruction data
  const data: number[] = [];

  // Header: count and padding
  data.push(signatures.length); // count
  data.push(0); // padding

  // Signature entries (7 u16 values each)
  for (let i = 0; i < signatures.length; i++) {
    // signature_offset: u16 (little-endian)
    const sigOffset = signatureOffsets[i];
    data.push(sigOffset & 0xff);
    data.push((sigOffset >> 8) & 0xff);

    // signature_instruction_index: u16 (THIS_IX = 0xFFFF)
    data.push(0xff);
    data.push(0xff);

    // public_key_offset: u16 (little-endian)
    const pkOffset = publicKeyOffsets[i];
    data.push(pkOffset & 0xff);
    data.push((pkOffset >> 8) & 0xff);

    // public_key_instruction_index: u16 (THIS_IX = 0xFFFF)
    data.push(0xff);
    data.push(0xff);

    // message_data_offset: u16 (little-endian)
    data.push(messageOffset & 0xff);
    data.push((messageOffset >> 8) & 0xff);

    // message_data_size: u16 (little-endian)
    data.push(message.length & 0xff);
    data.push((message.length >> 8) & 0xff);

    // message_instruction_index: u16 (THIS_IX = 0xFFFF)
    data.push(0xff);
    data.push(0xff);
  }

  // Append all signatures
  for (const sig of signatures.map((s) => s.signature)) {
    data.push(...Array.from(sig));
  }

  // Append all public keys
  for (const pk of signatures.map((s) => s.signer.toBytes())) {
    data.push(...Array.from(pk));
  }

  // Append message (once, shared by all signatures)
  data.push(...Array.from(message));

  return new TransactionInstruction({
    programId: Ed25519Program.programId,
    keys: [],
    data: Buffer.from(data),
  });
}
