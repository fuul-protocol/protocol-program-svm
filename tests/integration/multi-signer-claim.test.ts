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
} from '@fuul/sdk-solana';
import { sendInstructions } from '../utils/svm';
import { createEd25519Instruction } from '../utils/ed25519';
import { expect } from 'chai';
import crypto from 'crypto';
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// To enable sync usage of @noble/ed25519
ed25519.hashes.sha512 = sha512;

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
    const signatures = claimMessage.sign([signer1, signer1]);

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

  it('Should reject when signatures reference different messages (multi-sig bypass attempt)', async () => {
    // Set required signers to 2
    await sendInstructions(
      svm,
      globalAdmin,
      await sdk.updateGlobalConfig({
        authority: globalAdmin.publicKey,
        requiredSignersForClaim: 2,
      }),
    );

    // Create two different claim messages
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

    const differentMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(10000), // Different amount
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

    // Sign each message with a different signer
    const signature1 = {
      signature: ed25519.sign(claimMessage.toBuffer(), signer1.secretKey.slice(0, 32)),
      signer: signer1.publicKey,
      message: claimMessage.toBuffer(),
    };
    const signature2 = {
      signature: ed25519.sign(differentMessage.toBuffer(), signer2.secretKey.slice(0, 32)),
      signer: signer2.publicKey,
      message: differentMessage.toBuffer(),
    };

    // Create malicious Ed25519 instruction with different messages per signature
    const maliciousEd25519Ix = createEd25519Instruction([signature1, signature2]);

    // Build the claim instructions
    const claimInstructions = await sdk.claim({
      authority: authority.publicKey,
      projectNonce: project.nonce,
      message: claimMessage,
      signatures: [
        { signature: signature1.signature, signer: signature1.signer },
        { signature: signature2.signature, signer: signature2.signer },
      ],
    });

    // Replace the Ed25519 instruction with our malicious one
    claimInstructions[0] = maliciousEd25519Ix;

    try {
      await sendInstructions(svm, authority, claimInstructions);
      expect.fail('Should have failed - signatures reference different messages');
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal('InvalidInstructionSysvar');
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
