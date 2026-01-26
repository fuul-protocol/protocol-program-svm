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
} from '@wakeuplabs/fuul-solana';
import { sendInstructions, setClock } from '../utils/svm';
import { expect } from 'chai';
import * as anchor from '@coral-xyz/anchor';
import crypto from 'crypto';

describe('Cooldown Reset Flow', () => {
  const CLAIM_LIMIT = 1000;
  const COOLDOWN_PERIOD = 86400; // 1 day in seconds

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
  const executeClaim = async (authority: Keypair, recipient: Keypair, amount: number) => {
    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(amount),
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
    ({ globalAdmin, signer } = await loadGlobalConfigFixture({
      svm,
      sdk,
    }));
    ({ project, projectPda } = await loadProjectFixture({ svm, sdk }));

    // Add fungible token with claim limit and deposit tokens to project
    ({ fungibleTokenMint, minter } = await loadFungibleCurrencyTokenFixture({
      svm,
      sdk,
      globalAdmin,
      claimLimitPerCooldown: new anchor.BN(CLAIM_LIMIT),
    }));
    await loadFungibleDepositFixture({
      svm,
      sdk,
      project,
      minter,
      fungibleTokenMint,
      amount: 10000,
    });

    // Create authority and recipient
    authority = await loadFundedAccount(svm);
    recipient = await loadFundedAccount(svm);
  });

  it('should track cumulative claims within cooldown period', async () => {
    // Claim 1: 300 tokens
    await executeClaim(authority, recipient, 300);
    let currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
    expect(currencyToken.cumulativeClaimPerCooldown.toNumber()).to.equal(300);

    // Claim 2: 400 tokens (cumulative = 700)
    await executeClaim(authority, recipient, 400);
    currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
    expect(currencyToken.cumulativeClaimPerCooldown.toNumber()).to.equal(700);

    // Claim 3: 300 tokens (cumulative = 1000, exactly at limit)
    await executeClaim(authority, recipient, 300);
    currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
    expect(currencyToken.cumulativeClaimPerCooldown.toNumber()).to.equal(1000);

    // Claim 4: 1 token -> should fail
    try {
      await executeClaim(authority, recipient, 1);
      expect.fail('Should have failed');
    } catch (error) {
      expect(error.error.errorCode.code).to.equal('ClaimLimitExceeded');
    }
  });

  it('should reset cumulative after cooldown expires', async () => {
    // Make initial claim to set cooldown period
    await executeClaim(authority, recipient, 500);
    let currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
    expect(currencyToken.cumulativeClaimPerCooldown.toNumber()).to.equal(500);

    // Get current cooldown start time
    const cooldownStart = currencyToken.claimCooldownPeriodStarted.toNumber();

    // Advance clock past cooldown period
    const newTime = cooldownStart + COOLDOWN_PERIOD + 1;
    setClock(svm, BigInt(newTime));

    // Claim should succeed and reset cumulative
    await executeClaim(authority, recipient, 500);

    currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
    expect(currencyToken.cumulativeClaimPerCooldown.toNumber()).to.equal(500);

    expect(currencyToken.claimCooldownPeriodStarted.toNumber()).to.be.greaterThanOrEqual(newTime);

    // Can now claim up to limit again
    await executeClaim(authority, recipient, 500);
    currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
    expect(currencyToken.cumulativeClaimPerCooldown.toNumber()).to.equal(1000);
  });
});
