import { Keypair, PublicKey } from '@solana/web3.js';
import {
  loadFungibleCurrencyTokenFixture,
  loadFungibleDepositFixture,
  loadGlobalConfigFixture,
  loadProjectFixture,
  loadSvmSdk,
  loadFundedAccount,
} from '../utils/fixtures';
import { LiteSVM } from 'litesvm';
import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  FuulSdk,
  MessageDomain,
  TokenType,
} from '@fuul/sdk-solana';
import { sendInstructions, setClock } from '../utils/svm';
import { expect } from 'chai';
import crypto from 'crypto';

describe('Security Tests', () => {
  let svm: LiteSVM;
  let sdk: FuulSdk;
  let globalAdmin: Keypair;
  let signer: Keypair;
  let fungibleTokenMint: PublicKey;
  let projectPda: PublicKey;
  let project: any;
  let authority: Keypair;
  let recipient: Keypair;
  let minter: Keypair;

  // Helper function to execute a claim
  const executeClaim = async (
    authority: Keypair,
    recipient: Keypair,
    amount: number,
    proof?: Buffer,
    customMessage?: ClaimMessage,
  ) => {
    const claimMessage =
      customMessage ||
      new ClaimMessage({
        data: new ClaimMessageData({
          amount: BigInt(amount),
          project: projectPda,
          recipient: recipient.publicKey,
          tokenType: TokenType.FungibleSpl,
          tokenMint: fungibleTokenMint,
          proof: proof ?? crypto.randomBytes(32),
          reason: ClaimReason.AffiliatePayout,
        }),
        domain: new MessageDomain({
          programId: sdk.getProgram().programId,
          version: 1,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        }),
      });

    await sendInstructions(
      svm,
      authority,
      await sdk.claim({
        authority: authority.publicKey,
        projectNonce: project.nonce,
        message: claimMessage,
        signatures: claimMessage.sign([signer]),
      }),
    );
  };

  beforeEach(async () => {
    ({ svm, sdk } = await loadSvmSdk());
    ({ globalAdmin, signer } = await loadGlobalConfigFixture({ svm, sdk }));
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

    // Create test accounts
    authority = await loadFundedAccount(svm);
    recipient = await loadFundedAccount(svm);
  });

  it('should prevent replay attacks with same proof', async () => {
    const proofWithoutProject = crypto.randomBytes(32);

    // First claim succeeds
    await executeClaim(authority, recipient, 100, proofWithoutProject);

    // Second claim with same proof fails (account already initialized)
    try {
      await executeClaim(authority, recipient, 100, proofWithoutProject);
      expect.fail('Should have failed');
    } catch (error: any) {
      // AnchorError structure: error.error.errorCode.code
      // For init constraint failures, it might be AccountAlreadyInitialized or a system error
      const errorCode =
        error?.error?.errorCode?.code || error?.errorCode?.code || error?.code || String(error);
      // The error should indicate the account already exists
      expect(
        errorCode === 'AccountAlreadyInitialized' ||
          errorCode.includes('already in use') ||
          errorCode.includes('AccountAlreadyInitialized'),
      ).to.be.true;
    }
  });

  it('should prevent expired signature usage', async () => {
    // Set clock to current time
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    setClock(svm, currentTime);

    // Create message with deadline in the past (1 hour ago)
    const expiredDeadline = currentTime - BigInt(3600);

    const message = new ClaimMessage({
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
        deadline: expiredDeadline,
      }),
    });

    try {
      await executeClaim(authority, recipient, 100, undefined, message);
      expect.fail('Should have failed');
    } catch (error: any) {
      // AnchorError structure: error.error.errorCode.code
      if (error?.error?.errorCode?.code) {
        expect(error.error.errorCode.code).to.equal('DeadlineExpired');
      } else {
        // Fallback: try other possible error structures
        const errorCode = error?.errorCode?.code || error?.code || String(error);
        expect(errorCode).to.include('DeadlineExpired');
      }
    }
  });

  it('should prevent wrong program signatures', async () => {
    const wrongProgramId = Keypair.generate().publicKey;

    const message = new ClaimMessage({
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
        programId: wrongProgramId,
        version: 1,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      }),
    });

    try {
      await executeClaim(authority, recipient, 100, undefined, message);
      expect.fail('Should have failed');
    } catch (error: any) {
      const errorCode = error?.error?.errorCode?.code || error?.errorCode?.code || error?.code;
      expect(errorCode).to.equal('ProgramIdMismatch');
    }
  });
});
