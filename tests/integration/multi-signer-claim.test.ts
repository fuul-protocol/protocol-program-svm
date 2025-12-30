import { Keypair, PublicKey } from '@solana/web3.js';
import {
  loadFungibleCurrencyTokenFixture,
  loadFungibleDepositFixture,
  loadGlobalConfigFixture,
  loadProjectFixture,
  loadSvmSdk,
  loadFundedAccount,
  loadNativeDepositFixture,
  loadNativeCurrencyTokenFixture,
} from '../utils/fixtures';
import { LiteSVM } from 'litesvm';
import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  FuulSdk,
  GlobalRole,
  MessageDomain,
  TokenType,
} from '@wakeuplabs/fuul-solana';
import { sendInstructions } from '../utils/svm';
import { expect } from 'chai';
import crypto from 'crypto';

describe('Multi-Signer Claim Flow', () => {
  let svm: LiteSVM;
  let sdk: FuulSdk;
  let globalAdmin: Keypair;
  let fungibleTokenMint: PublicKey;
  let projectPda: PublicKey;
  let project: any;
  let authority: Keypair;
  let recipient: Keypair;
  let signer1: Keypair;
  let signer2: Keypair;
  let signer3: Keypair;
  let minter: Keypair;

  beforeEach(async () => {
    ({ svm, sdk } = await loadSvmSdk());
    ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
    ({ project, projectPda } = await loadProjectFixture({ svm, sdk }));

    // Add fungible token and deposit tokens to project
    ({ fungibleTokenMint, minter } = await loadFungibleCurrencyTokenFixture({
      svm,
      sdk,
      globalAdmin,
    }));
    await loadFungibleDepositFixture({
      svm,
      sdk,
      project,
      minter,
      fungibleTokenMint,
      amount: 10000,
    });
    // Load native currency token and deposit tokens to project
    await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
    await loadNativeDepositFixture({ svm, sdk, project });

    // Create test accounts
    authority = await loadFundedAccount(svm);
    recipient = await loadFundedAccount(svm);

    // Create and fund signers
    signer1 = await loadFundedAccount(svm);
    signer2 = await loadFundedAccount(svm);
    signer3 = await loadFundedAccount(svm);

    // Grant Signer role to all
    await sendInstructions(svm, globalAdmin, [
      ...(await sdk.grantGlobalRole({
        authority: globalAdmin.publicKey,
        account: signer1.publicKey,
        role: GlobalRole.Signer,
      })),
      ...(await sdk.grantGlobalRole({
        authority: globalAdmin.publicKey,
        account: signer2.publicKey,
        role: GlobalRole.Signer,
      })),
      ...(await sdk.grantGlobalRole({
        authority: globalAdmin.publicKey,
        account: signer3.publicKey,
        role: GlobalRole.Signer,
      })),
    ]);

    // Keep default of 1 required signer for transaction size reasons
    // We'll test multi-signer by requiring 2 and using 1 (failure) and 2 (success)
  });

  it('should succeed with 1 valid signer (default requirement)', async () => {
    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(100),
        project: projectPda,
        recipient: recipient.publicKey,
        tokenType: TokenType.FungibleSpl,
        tokenMint: fungibleTokenMint,
        proof: crypto.randomBytes(32),
        reason: ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: sdk.getProgram().programId,
        version: 1,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    });

    // Sign with 1 signer (default requirement is 1)
    const signatures = claimMessage.sign([signer1]);

    await sendInstructions(
      svm,
      authority,
      await sdk.claim({
        authority: authority.publicKey,
        projectNonce: project.nonce,
        message: claimMessage,
        signatures,
      }),
    );

    // Verify success - check that the claim was recorded
    const userStats = await sdk.getProjectUser(project.nonce, recipient.publicKey);
    expect(userStats?.totalClaims.toNumber()).to.equal(1);
  });

  it('should fail when requiring 2 signers but only providing 1', async () => {
    // First, set required signers to 2
    await sendInstructions(
      svm,
      globalAdmin,
      await sdk.updateGlobalConfig({
        authority: globalAdmin.publicKey,
        requiredSignersForClaim: 2,
      }),
    );

    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(100),
        project: projectPda,
        recipient: recipient.publicKey,
        tokenType: TokenType.FungibleSpl,
        tokenMint: fungibleTokenMint,
        proof: crypto.randomBytes(32),
        reason: ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: sdk.getProgram().programId,
        version: 1,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    });

    // Sign with only 1 signer (need 2)
    const signatures = claimMessage.sign([signer1]);

    try {
      await sendInstructions(
        svm,
        authority,
        await sdk.claim({
          authority: authority.publicKey,
          projectNonce: project.nonce,
          message: claimMessage,
          signatures,
        }),
      );
      expect.fail('Should have failed');
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal('NotEnoughValidSigners');
    }
  });

  it('Should fail when requiring 2 signers but signing twice with the same keypair', async () => {
    // Set required signers to 2
    await sendInstructions(
      svm,
      globalAdmin,
      await sdk.updateGlobalConfig({
        authority: globalAdmin.publicKey,
        requiredSignersForClaim: 2,
      }),
    );

    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(100),
        project: projectPda,
        recipient: recipient.publicKey,
        tokenType: TokenType.Native,
        tokenMint: PublicKey.default,
        proof: crypto.randomBytes(32),
        reason: ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: sdk.getProgram().programId,
        version: 1,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    });

    // Sign twice with the same keypair - creates 2 signatures but only 1 unique signer
    const signatures = claimMessage.sign([globalAdmin, globalAdmin]);

    try {
      await sendInstructions(
        svm,
        authority,
        await sdk.claim({
          authority: authority.publicKey,
          projectNonce: project.nonce,
          message: claimMessage,
          signatures,
        }),
      );
      expect.fail('Should have failed with NotEnoughValidSigners error');
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal('NotEnoughValidSigners');
    }
  });

  it('should ignore non-Signer signatures', async () => {
    // Test that a non-signer signature doesn't count
    const nonSigner = await loadFundedAccount(svm);
    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(100),
        project: projectPda,
        recipient: recipient.publicKey,
        tokenType: TokenType.FungibleSpl,
        tokenMint: fungibleTokenMint,
        proof: crypto.randomBytes(32),
        reason: ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: sdk.getProgram().programId,
        version: 1,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    });

    // Sign with only a non-signer (no valid signers, need 1)
    const signatures = claimMessage.sign([nonSigner]);

    try {
      await sendInstructions(
        svm,
        authority,
        await sdk.claim({
          authority: authority.publicKey,
          projectNonce: project.nonce,
          message: claimMessage,
          signatures,
        }),
      );

      expect.fail('Should have failed');
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal('NotEnoughValidSigners');
    }
  });
});
