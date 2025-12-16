import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createBurnInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { LiteSVMProvider } from 'anchor-litesvm';
import { sendTransaction } from './svm';
import { LiteSVM } from 'litesvm';

/**
 * Creates an SPL token
 * @param provider - The LiteSVM provider
 * @param owner - The owner/mint authority keypair
 * @param decimals - The number of decimals for the token
 * @returns The mint public key
 */
export const createFungibleToken = async (svm: LiteSVM, owner: Keypair, decimals: number = 9) => {
  const provider = new LiteSVMProvider(svm);

  const mintKeypair = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: owner.publicKey,
    newAccountPubkey: mintKeypair.publicKey,
    lamports,
    space: MINT_SIZE,
    programId: TOKEN_PROGRAM_ID,
  });

  const initializeMintIx = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    decimals,
    owner.publicKey, // mint authority
    null, // freeze authority
    TOKEN_PROGRAM_ID,
  );

  await provider.sendAndConfirm(
    new anchor.web3.Transaction().add(createAccountIx, initializeMintIx),
    [owner, mintKeypair],
  );

  return mintKeypair.publicKey;
};

/**
 * Gets or creates an associated token account for a specific owner
 * @param svm - The LiteSVM instance
 * @param mint - The SPL token mint
 * @param owner - The owner of the token account
 * @param ownerIsPda - Whether the owner is a PDA
 * @param payer - The keypair of the payer
 * @returns The associated token account
 */
export const getOrCreateAssociatedTokenAccount = async (
  svm: LiteSVM,
  mint: PublicKey,
  owner: PublicKey,
  ownerIsPda: boolean,
  payer: Keypair,
) => {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    ownerIsPda,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const ataInfo = svm.getAccount(ata);
  if (!ataInfo) {
    const createAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    await sendTransaction(svm, new anchor.web3.Transaction().add(createAtaIx), payer);
  }
  return ata;
};

/**
 * Checks if an associated token account exists for a specific owner
 * @param svm - The LiteSVM instance
 * @param mint - The SPL token mint
 * @param owner - The owner of the token account
 * @param ownerIsPda - Whether the owner is a PDA
 * @returns True if the ATA exists, false otherwise
 */
export const ataExists = async (
  svm: LiteSVM,
  mint: PublicKey,
  owner: PublicKey,
  ownerIsPda: boolean,
) => {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    ownerIsPda,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const ataInfo = svm.getAccount(ata);
  return ataInfo !== null;
};

/**
 * Gets the balance of an SPL token for a specific owner
 * @param svm - The LiteSVM instance
 * @param mint - The SPL token mint
 * @param owner - The owner of the token account
 * @param allowOwnerOffCurve - Whether to allow the owner to be off the curve
 * @returns The balance of the SPL token (0 if account doesn't exist)
 */
export const getSplTokenBalance = async (
  svm: LiteSVM,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
) => {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    allowOwnerOffCurve,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  try {
    const ataInfo = await getAccount(
      new LiteSVMProvider(svm).connection,
      ata,
      undefined,
      TOKEN_PROGRAM_ID,
    );
    return BigInt(ataInfo?.amount ?? 0);
  } catch {
    // LiteSVM throws "Could not find" for non-existent accounts
    return BigInt(0);
  }
};

/**
 * Creates an NFT (SPL token with 0 decimals and supply of 1)
 * @param svm - The LiteSVM instance
 * @param owner - The owner/mint authority keypair
 * @returns The NFT mint public key
 */
export const createNonFungibleToken = async (svm: LiteSVM, owner: Keypair): Promise<PublicKey> => {
  // Create a mint with 0 decimals (NFT standard)
  return await createFungibleToken(svm, owner, 0);
};

/**
 * Mints a non-fungible token to a specific token account
 * @param svm - The LiteSVM instance
 * @param mint - The non-fungible token mint
 * @param destination - The destination token account
 * @param authority - The mint authority keypair
 */
export const mintNonFungibleTokenTo = async (opts: {
  svm: LiteSVM;
  mint: PublicKey;
  minter: Keypair;
  destination: PublicKey;
  destinationIsPda?: boolean;
}): Promise<void> => {
  const { svm, mint, minter, destination, destinationIsPda = false } = opts;

  const ata = await getOrCreateAssociatedTokenAccount(
    svm,
    mint,
    destination,
    destinationIsPda,
    minter,
  );

  const mintToIx = createMintToInstruction(
    mint,
    ata,
    minter.publicKey,
    1, // NFTs have amount of 1
    [],
    TOKEN_PROGRAM_ID,
  );

  await sendTransaction(svm, new anchor.web3.Transaction().add(mintToIx), minter);
};

/**
 * Mints a fungible token to a specific token account
 * @param svm - The LiteSVM instance
 * @param mint - The fungible token mint
 * @param destination - The destination token account
 * @param authority - The mint authority keypair
 */
export const mintFungibleTokenTo = async (opts: {
  svm: LiteSVM;
  mint: PublicKey;
  minter: Keypair;
  destination: PublicKey;
  destinationIsPda?: boolean;
  amount: number | bigint;
}): Promise<void> => {
  const { svm, mint, minter, destination, destinationIsPda = false, amount } = opts;

  const ata = await getOrCreateAssociatedTokenAccount(
    svm,
    mint,
    destination,
    destinationIsPda,
    minter,
  );

  const mintToIx = createMintToInstruction(
    mint,
    ata,
    minter.publicKey,
    amount,
    [],
    TOKEN_PROGRAM_ID,
  );

  await sendTransaction(svm, new anchor.web3.Transaction().add(mintToIx), minter);
};

export const ownsNft = async (svm: LiteSVM, owner: PublicKey, mint: PublicKey) => {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner);

    const account = await getAccount(new LiteSVMProvider(svm).connection, ata);
    return account.amount === BigInt(1);
  } catch {
    return false;
  }
};

export const burnNft = async (svm: LiteSVM, mint: PublicKey, owner: Keypair) => {
  const ata = await getAssociatedTokenAddress(mint, owner.publicKey);

  const burnIx = createBurnInstruction(ata, mint, owner.publicKey, BigInt(1), [], TOKEN_PROGRAM_ID);

  await sendTransaction(svm, new anchor.web3.Transaction().add(burnIx), owner);
};
