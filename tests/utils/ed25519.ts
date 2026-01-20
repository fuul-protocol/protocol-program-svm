import { TransactionInstruction, Ed25519Program, PublicKey } from '@solana/web3.js';

/**
 * Creates an Ed25519 instruction with multiple signatures where each signature
 * can reference a DIFFERENT message. This is useful for testing the vulnerability
 * fix that prevents combining signatures from different messages.
 *
 * **WARNING**: This function creates a malicious Ed25519 instruction that attempts
 * to bypass multi-signature validation. It should ONLY be used for testing purposes
 * to verify that the program correctly rejects such attacks.
 *
 * Format: [count: u8, padding: u8, ...signature_entries: 14 bytes each, ...signatures, ...pubkeys, ...messages]
 * Each signature entry references its own message at a different offset.
 *
 * @param signatureMessagePairs - Array of objects containing signature, signer, and the message it signed
 * @returns A transaction instruction for Ed25519 signature verification with multiple signers and messages
 *
 * @example
 * ```typescript
 * const sig1 = { signature: sign(msg1, key1), signer: pubkey1, message: msg1 };
 * const sig2 = { signature: sign(msg2, key2), signer: pubkey2, message: msg2 };
 * const maliciousIx = createEd25519Instruction([sig1, sig2]);
 * // This instruction will be rejected by the program's security fix
 * ```
 */
export function createEd25519Instruction(
  signatureMessagePairs: Array<{
    signature: Uint8Array;
    signer: PublicKey;
    message: Buffer;
  }>,
): TransactionInstruction {
  if (signatureMessagePairs.length === 0) {
    throw new Error('At least one signer is required');
  }
  if (signatureMessagePairs.length > 255) {
    throw new Error('Maximum 255 signers supported');
  }

  const SIG_LEN = 64;
  const PUBKEY_LEN = 32;
  const HEADER_LEN = 2; // count + padding
  const SIG_ENTRY_LEN = 14; // 7 u16 values per signature entry

  const numSignatures = signatureMessagePairs.length;
  const minHeaderLen = HEADER_LEN + numSignatures * SIG_ENTRY_LEN;

  // Calculate offsets for signatures, public keys, and messages
  // Layout: [header][sig1][sig2]...[sigN][pk1][pk2]...[pkN][msg1][msg2]...[msgN]
  const signatureOffsets: number[] = [];
  const publicKeyOffsets: number[] = [];
  const messageOffsets: number[] = [];

  let offset = minHeaderLen;

  // All signatures come first
  for (let i = 0; i < numSignatures; i++) {
    signatureOffsets.push(offset);
    offset += SIG_LEN;
  }

  // Then all public keys
  for (let i = 0; i < numSignatures; i++) {
    publicKeyOffsets.push(offset);
    offset += PUBKEY_LEN;
  }

  // Then all messages (each at different offset - this is the attack vector!)
  for (let i = 0; i < numSignatures; i++) {
    messageOffsets.push(offset);
    offset += signatureMessagePairs[i].message.length;
  }

  // Build the instruction data
  const data: number[] = [];

  // Header: count and padding
  data.push(numSignatures); // count
  data.push(0); // padding

  // Signature entries (7 u16 values each)
  for (let i = 0; i < numSignatures; i++) {
    const messageLength = signatureMessagePairs[i].message.length;

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

    // message_data_offset: u16 (little-endian) - DIFFERENT for each signature!
    const msgOffset = messageOffsets[i];
    data.push(msgOffset & 0xff);
    data.push((msgOffset >> 8) & 0xff);

    // message_data_size: u16 (little-endian) - Can be DIFFERENT for each signature!
    data.push(messageLength & 0xff);
    data.push((messageLength >> 8) & 0xff);

    // message_instruction_index: u16 (THIS_IX = 0xFFFF)
    data.push(0xff);
    data.push(0xff);
  }

  // Append all signatures
  for (const pair of signatureMessagePairs) {
    data.push(...Array.from(pair.signature));
  }

  // Append all public keys
  for (const pair of signatureMessagePairs) {
    data.push(...Array.from(pair.signer.toBytes()));
  }

  // Append all messages (each at different offset - this is the vulnerability!)
  for (const pair of signatureMessagePairs) {
    data.push(...Array.from(pair.message));
  }

  return new TransactionInstruction({
    programId: Ed25519Program.programId,
    keys: [],
    data: Buffer.from(data),
  });
}
