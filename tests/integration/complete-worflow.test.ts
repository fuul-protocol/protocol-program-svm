import {
  loadFungibleCurrencyTokenFixture,
  loadFungibleDepositFixture,
  loadGlobalConfigFixture,
  loadProjectFixture,
  loadSvmSdk,
  loadFundedAccount,
} from '../utils/fixtures';
import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  MessageDomain,
  TokenType,
} from '@wakeuplabs/fuul-solana';
import { sendInstructions } from '../utils/svm';
import * as anchor from '@coral-xyz/anchor';
import { getSplTokenBalance } from '../utils/spl';
import { expect } from 'chai';
import crypto from 'crypto';

describe('Complete Project Lifecycle', () => {
  it('should handle full project flow from creation to claim', async () => {
    // 1. Setup: Initialize SVM and SDK
    const { svm, sdk } = await loadSvmSdk();

    // 2. Create global config
    const { globalAdmin } = await loadGlobalConfigFixture({
      svm,
      sdk,
      userNativeClaimFee: new anchor.BN(1000), // 1000 lamports
      projectClaimFee: new anchor.BN(500), // 500 basis points = 5%
    });

    // 3. Add currency tokens
    const { fungibleTokenMint, minter } = await loadFungibleCurrencyTokenFixture({
      svm,
      sdk,
      globalAdmin,
    });

    // 4. Create project
    const { project, projectPda } = await loadProjectFixture({ svm, sdk });

    // 5. Deposit tokens to project
    const depositAmount = 10000;
    await loadFungibleDepositFixture({
      svm,
      sdk,
      project,
      minter,
      fungibleTokenMint,
      amount: depositAmount,
    });

    // 6. Execute claim with signature
    const recipient = await loadFundedAccount(svm);
    const claimAmount = BigInt(1000);
    const proofWithoutProject = crypto.randomBytes(32);

    const claimMessage = new ClaimMessage({
      data: new ClaimMessageData({
        amount: claimAmount,
        project: projectPda,
        recipient: recipient.publicKey,
        tokenType: TokenType.FungibleSpl,
        tokenMint: fungibleTokenMint,
        proofWithoutProject,
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
      recipient,
      await sdk.claim({
        authority: recipient.publicKey,
        projectNonce: project.nonce,
        message: claimMessage,
        signatures: claimMessage.sign([globalAdmin]),
      }),
    );

    // 7. Verify final state
    const budget = await sdk.getProjectCurrencyBudget(project.nonce, fungibleTokenMint);
    const userStats = await sdk.getProjectUser(project.nonce, recipient.publicKey);
    const recipientBalance = await getSplTokenBalance(
      svm,
      fungibleTokenMint,
      recipient.publicKey,
      false,
    );

    // Calculate expected budget
    const projectFee = (Number(claimAmount) * 500) / 10000; // 5%
    const expectedBudget = depositAmount - Number(claimAmount) - projectFee;

    expect(budget.budget.toNumber()).to.equal(expectedBudget);
    expect(userStats?.totalClaims.toNumber()).to.equal(1);
    expect(recipientBalance).to.equal(claimAmount);
  });
});
