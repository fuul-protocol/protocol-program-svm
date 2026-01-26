import {
  FuulSdk,
  getProjectPda,
  GlobalConfig,
  Network,
  Project,
  TokenType,
} from '@wakeuplabs/fuul-solana';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from './svm';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  createNonFungibleToken,
  createFungibleToken,
  mintNonFungibleTokenTo,
  mintFungibleTokenTo,
} from './spl';
import { fromWorkspace, LiteSVMProvider } from 'anchor-litesvm';
import * as anchor from '@coral-xyz/anchor';

/**
 * Generates a new account keypair and funds it with SOL if needed
 * @param svm - The SVM instance
 * @param fund - The amount of SOL to fund the account with
 * @returns The generated account keypair
 */
export const loadFundedAccount = async (
  svm: LiteSVM,
  fund: bigint = BigInt(10 * LAMPORTS_PER_SOL),
): Promise<Keypair> => {
  const acc = Keypair.generate();
  if (fund > BigInt(0)) {
    svm.airdrop(acc.publicKey, fund);
  }
  return acc;
};

/**
 * Sets up a workspace for testing
 * @returns The SVM instance, provider, and SDK instance
 */
export const loadSvmSdk = (): { svm: LiteSVM; provider: LiteSVMProvider; sdk: FuulSdk } => {
  const svm = fromWorkspace('./')
    .withBuiltins()
    .withSysvars()
    .withDefaultPrograms()
    .withPrecompiles()
    .withTransactionHistory(BigInt(0));
  const provider = new LiteSVMProvider(svm);
  anchor.setProvider(provider);
  const sdk = new FuulSdk(provider.connection, Network.LOCALHOST);
  return { svm, provider, sdk };
};

/**
 * Loads a global config and a global admin keypair
 * @param svm - The SVM instance
 * @param sdk - The Fuul SDK instance
 * @returns The global admin keypair and fee collector keypair
 */
export const loadGlobalConfigFixture = async ({
  svm,
  sdk,
  projectClaimFee,
  removeFee,
  userNativeClaimFee,
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  removeFee?: number;
  projectClaimFee?: number;
  userNativeClaimFee?: anchor.BN;
}): Promise<{
  globalAdmin: Keypair;
  feeCollector: Keypair;
  signer: Keypair;
  globalConfig: GlobalConfig;
}> => {
  // create and fund a global admin
  const globalAdmin = await loadFundedAccount(svm);
  const feeCollector = await loadFundedAccount(svm);
  const signer = await loadFundedAccount(svm);

  await sendInstructions(svm, globalAdmin, [
    ...(await sdk.createGlobalConfig({
      authority: globalAdmin.publicKey,
      feeCollector: feeCollector.publicKey,
      initialSigner: signer.publicKey,
    })),
    ...(projectClaimFee || removeFee || userNativeClaimFee
      ? [
          ...(await sdk.updateGlobalConfigFees({
            authority: globalAdmin.publicKey,
            removeFee,
            projectClaimFee,
            userNativeClaimFee,
          })),
        ]
      : []),
  ]);

  return { globalAdmin, feeCollector, signer, globalConfig: await sdk.getGlobalConfig() };
};

/**
 * Loads Native SOL as an accepted currency into the global config
 * @param svm - The SVM instance
 * @param sdk - The Fuul SDK instance
 * @param globalAdmin - The global admin keypair
 * @param claimLimitPerCooldown - Optional claim limit per cooldown
 */
export const loadNativeCurrencyTokenFixture = async ({
  svm,
  sdk,
  globalAdmin,
  claimLimitPerCooldown = new anchor.BN('1000000000000000'),
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  globalAdmin: Keypair;
  claimLimitPerCooldown?: anchor.BN;
}): Promise<void> => {
  await sendInstructions(svm, globalAdmin, [
    ...(await sdk.addCurrencyToken({
      authority: globalAdmin.publicKey,
      tokenType: TokenType.Native,
      tokenMint: PublicKey.default,
      claimLimitPerCooldown,
    })),
  ]);
};

/**
 * Loads a Fungible SPL token to the global config as an accepted currency and returns its mint and minter
 * @param svm - The SVM instance
 * @param sdk - The Fuul SDK instance
 * @param globalAdmin - The global admin keypair
 * @param claimLimitPerCooldown - Optional claim limit per cooldown
 * @returns The fungible token mint and minter keypair
 */
export const loadFungibleCurrencyTokenFixture = async ({
  svm,
  sdk,
  globalAdmin,
  claimLimitPerCooldown = new anchor.BN(1000),
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  globalAdmin: Keypair;
  claimLimitPerCooldown?: anchor.BN;
}): Promise<{
  fungibleTokenMint: PublicKey;
  minter: Keypair;
}> => {
  const minter = await loadFundedAccount(svm);
  const fungibleTokenMint = await createFungibleToken(svm, minter);

  await sendInstructions(svm, globalAdmin, [
    ...(await sdk.addCurrencyToken({
      authority: globalAdmin.publicKey,
      tokenType: TokenType.FungibleSpl,
      tokenMint: fungibleTokenMint,
      claimLimitPerCooldown,
    })),
  ]);

  return {
    fungibleTokenMint,
    minter,
  };
};

/**
 * Loads a Non-Fungible SPL token to the global config as an accepted currency and returns its mint and minter
 * @param svm - The SVM instance
 * @param sdk - The Fuul SDK instance
 * @param globalAdmin - The global admin keypair
 * @param claimLimitPerCooldown - Optional claim limit per cooldown
 * @returns The non-fungible token mint and minter keypair
 */
export const loadNonFungibleCurrencyTokenFixture = async ({
  svm,
  sdk,
  globalAdmin,
  claimLimitPerCooldown = new anchor.BN(1000),
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  globalAdmin: Keypair;
  claimLimitPerCooldown?: anchor.BN;
}): Promise<{
  nonFungibleTokenMint: PublicKey;
  minter: Keypair;
}> => {
  const minter = await loadFundedAccount(svm);
  const nonFungibleTokenMint = await createNonFungibleToken(svm, minter);

  await sendInstructions(svm, globalAdmin, [
    ...(await sdk.addCurrencyToken({
      authority: globalAdmin.publicKey,
      tokenType: TokenType.NonFungibleSpl,
      tokenMint: nonFungibleTokenMint,
      claimLimitPerCooldown,
    })),
  ]);

  return {
    nonFungibleTokenMint,
    minter,
  };
};

/**
 * Loads a project and a project owner keypair
 * @param svm - The SVM instance
 * @param sdk - The Fuul SDK instance
 * @param globalAdmin - The global admin keypair (required for project creation)
 * @returns The project, project PDA, project owner keypair, and client fee collector keypair
 */
export const loadProjectFixture = async ({
  svm,
  sdk,
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
}): Promise<{
  project: Project;
  projectPda: PublicKey;
  projectOwner: Keypair;
}> => {
  const projectOwner = await loadFundedAccount(svm);

  const projectNonce = new anchor.BN(0);
  await sendInstructions(
    svm,
    projectOwner,
    await sdk.createProject({
      authority: projectOwner.publicKey,
      projectAdmin: projectOwner.publicKey,
    }),
  );

  return {
    project: await sdk.getProject(projectNonce),
    projectPda: getProjectPda(sdk.getProgram().programId, projectNonce)[0],
    projectOwner,
  };
};

export const loadNonFungibleDepositFixture = async ({
  svm,
  sdk,
  project,
  minter,
  nonFungibleTokenMint,
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  project: Project;
  minter: Keypair;
  nonFungibleTokenMint: PublicKey;
}): Promise<void> => {
  // Mint and deposit
  await mintNonFungibleTokenTo({
    svm,
    mint: nonFungibleTokenMint,
    minter,
    destination: minter.publicKey,
  });
  await sendInstructions(svm, minter, [
    ...(await sdk.depositNonFungibleToken({
      authority: minter.publicKey,
      projectNonce: project.nonce,
      tokenMint: nonFungibleTokenMint,
    })),
  ]);
};

export const loadFungibleDepositFixture = async ({
  svm,
  sdk,
  project,
  minter,
  fungibleTokenMint,
  amount = BigInt('1000000000000000'),
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  project: Project;
  minter: Keypair;
  fungibleTokenMint: PublicKey;
  amount?: number | bigint;
}): Promise<void> => {
  // Mint and deposit
  await mintFungibleTokenTo({
    svm,
    mint: fungibleTokenMint,
    minter,
    destination: minter.publicKey,
    amount,
  });
  await sendInstructions(svm, minter, [
    ...(await sdk.depositFungibleToken({
      authority: minter.publicKey,
      projectNonce: project.nonce,
      tokenMint: fungibleTokenMint,
      amount: new anchor.BN(amount),
    })),
  ]);
};

export const loadNativeDepositFixture = async ({
  svm,
  sdk,
  project,
  amount = LAMPORTS_PER_SOL,
}: {
  svm: LiteSVM;
  sdk: FuulSdk;
  project: Project;
  amount?: number | bigint;
}): Promise<void> => {
  const depositer = await loadFundedAccount(svm);

  await sendInstructions(svm, depositer, [
    ...(await sdk.depositFungibleToken({
      authority: depositer.publicKey,
      projectNonce: project.nonce,
      tokenMint: PublicKey.default,
      amount: new anchor.BN(amount),
    })),
  ]);
};
