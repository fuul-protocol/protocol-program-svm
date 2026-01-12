import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  ClaimMessage,
  ClaimMessageData,
  ClaimReason,
  FuulSdk,
  GlobalConfig,
  MessageDomain,
  Project,
  TokenType,
} from '@wakeuplabs/fuul-solana';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from '../utils/svm';
import { ataExists, getSplTokenBalance, ownsNft } from '../utils/spl';
import { expect } from 'chai';
import {
  loadFungibleDepositFixture,
  loadGlobalConfigFixture,
  loadNativeDepositFixture,
  loadNonFungibleDepositFixture,
  loadProjectFixture,
  loadSvmSdk,
  loadFundedAccount,
  loadFungibleCurrencyTokenFixture,
  loadNonFungibleCurrencyTokenFixture,
  loadNativeCurrencyTokenFixture,
} from '../utils/fixtures';
import crypto from 'crypto';

describe('Claim', () => {
  let svm: LiteSVM;
  let sdk: FuulSdk;
  let globalAdmin, projectOwner, minter, feeCollector: Keypair;
  let fungibleTokenMint, nonFungibleTokenMint, projectPda: PublicKey;
  let project: Project;
  let globalConfig: GlobalConfig;

  // Just an utility function to quickly generate a test cases for native SOL claims
  const generateNativeClaimMessage = async (opts: {
    claimAmount?: bigint;
    projectPda?: PublicKey;
    recipient?: PublicKey | Keypair;
    proof?: Buffer;
    reason?: ClaimReason;
    deadline?: number;
    programId?: PublicKey;
    version?: number;
  }): Promise<ClaimMessage> => {
    return new ClaimMessage({
      data: new ClaimMessageData({
        amount: opts.claimAmount ?? BigInt(1),
        project: opts.projectPda ?? projectPda,
        recipient:
          opts.recipient instanceof Keypair
            ? opts.recipient.publicKey
            : opts.recipient ?? projectOwner.publicKey,
        tokenType: TokenType.Native,
        tokenMint: PublicKey.default,
        proof: opts.proof ?? crypto.randomBytes(32),
        reason: opts.reason ?? ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: opts.programId ?? sdk.getProgram().programId,
        version: opts.version ?? 1,
        deadline: opts.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
      }),
    });
  };

  // Just an utility function to quickly generate a test cases for fungible SPL tokens claims
  const generateFungibleClaimMessage = async (opts: {
    claimAmount?: bigint;
    projectPda?: PublicKey;
    recipient?: PublicKey | Keypair;
    fungibleTokenMint?: PublicKey;
    proof?: Buffer;
    reason?: ClaimReason;
    deadline?: number;
    programId?: PublicKey;
    version?: number;
  }): Promise<ClaimMessage> => {
    return new ClaimMessage({
      data: new ClaimMessageData({
        amount: opts.claimAmount ?? BigInt(1),
        project: opts.projectPda ?? projectPda,
        recipient:
          opts.recipient instanceof Keypair
            ? opts.recipient.publicKey
            : opts.recipient ?? projectOwner.publicKey,
        tokenType: TokenType.FungibleSpl,
        tokenMint: opts.fungibleTokenMint ?? fungibleTokenMint,
        proof: opts.proof ?? crypto.randomBytes(32),
        reason: opts.reason ?? ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: opts.programId ?? sdk.getProgram().programId,
        version: opts.version ?? 1,
        deadline: opts.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
      }),
    });
  };

  // Just an utility function to quickly generate a test cases for non-fungible SPL tokens claims
  const generateNonFungibleClaimMessage = async (opts: {
    projectPda?: PublicKey;
    recipient?: PublicKey | Keypair;
    nonFungibleTokenMint?: PublicKey;
    proof?: Buffer;
    reason?: ClaimReason;
    deadline?: number;
    programId?: PublicKey;
    version?: number;
  }): Promise<ClaimMessage> => {
    return new ClaimMessage({
      data: new ClaimMessageData({
        amount: BigInt(1),
        project: opts.projectPda ?? projectPda,
        recipient:
          opts.recipient instanceof Keypair
            ? opts.recipient.publicKey
            : opts.recipient ?? projectOwner.publicKey,
        tokenType: TokenType.NonFungibleSpl,
        tokenMint: opts.nonFungibleTokenMint ?? nonFungibleTokenMint,
        proof: opts.proof ?? crypto.randomBytes(32),
        reason: opts.reason ?? ClaimReason.AffiliatePayout,
      }),
      domain: new MessageDomain({
        programId: opts.programId ?? sdk.getProgram().programId,
        version: opts.version ?? 1,
        deadline: opts.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
      }),
    });
  };

  describe('Token Transfers', () => {
    describe('Claim Fungible SPL Tokens', () => {
      beforeEach(async () => {
        ({ svm, sdk } = await loadSvmSdk());
        ({ globalAdmin, globalConfig } = await loadGlobalConfigFixture({
          svm,
          sdk,
          projectClaimFee: 100,
          userNativeClaimFee: new anchor.BN(1000),
        }));
        ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

        // Add fungible token to the global config and deposit to project
        ({ fungibleTokenMint, minter } = await loadFungibleCurrencyTokenFixture({
          svm,
          sdk,
          globalAdmin,
        }));
        await loadFungibleDepositFixture({ svm, sdk, project, minter, fungibleTokenMint });
      });

      it('Should claim fungible SPL tokens successfully', async () => {
        try {
          const claimMessage = await generateFungibleClaimMessage({
            claimAmount: BigInt(1000),
            recipient: projectOwner.publicKey,
            proof: crypto.randomBytes(32),
          });

          await sendInstructions(
            svm,
            projectOwner,
            await sdk.claim({
              authority: projectOwner.publicKey,
              projectNonce: project.nonce,
              message: claimMessage,
              signatures: claimMessage.sign([globalAdmin]),
            }),
          );
        } catch {
          expect.fail('Should have claimed successfully');
        }
      });

      it('Should transfer tokens to recipient ATA', async () => {
        const claimAmount = BigInt(1000);
        const recipient = projectOwner.publicKey;

        // Get initial balances
        const initialRecipientBalance = await getSplTokenBalance(
          svm,
          fungibleTokenMint,
          recipient,
          false,
        );

        // Execute claim
        const claimMessage = await generateFungibleClaimMessage({
          claimAmount: claimAmount,
          recipient: projectOwner.publicKey,
          proof: crypto.randomBytes(32),
        });
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.claim({
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            message: claimMessage,
            signatures: claimMessage.sign([globalAdmin]),
          }),
        );

        // Verify balances changed
        const finalRecipientBalance = await getSplTokenBalance(
          svm,
          fungibleTokenMint,
          recipient,
          false,
        );
        expect(Number(initialRecipientBalance + claimAmount)).to.equal(
          Number(finalRecipientBalance),
        );
      });

      it('Should create ATAs if needed (SDK instruction)', async () => {
        // Use a fresh keypair that has no ATA for the fungible token
        const recipient = await loadFundedAccount(svm);

        // Verify the recipient doesn't have an ATA yet
        expect(await ataExists(svm, fungibleTokenMint, recipient.publicKey, false)).to.be.false;

        // Build the claim message
        const claimMessage = await generateFungibleClaimMessage({
          claimAmount: BigInt(1000),
          recipient: recipient.publicKey,
        });

        const instructions = await sdk.claim({
          authority: recipient.publicKey,
          message: claimMessage,
          projectNonce: project.nonce,
          signatures: claimMessage.sign([globalAdmin]),
        });

        // Verify the create instruction is present. (create ata for recipient, create ata for fee collector, signature verification and claim)
        expect(instructions.length).to.equal(4);
        expect(instructions[0].programId.toString()).to.equal(
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        );
        expect(instructions[1].programId.toString()).to.equal(
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
        );

        // Execute claim - this should create the ATA automatically
        await sendInstructions(svm, recipient, instructions);

        // Verify the ATA exists
        expect(await ataExists(svm, fungibleTokenMint, recipient.publicKey, false)).to.be.true;
      });

      it('Should decrement ProjectCurrencyBudget by (amount + project_fee)', async () => {
        const claimAmount = BigInt(1000);
        const projectClaimFee = BigInt(globalConfig.feeManagement.projectClaimFee.toString());

        const projectCurrencyBudgetBefore = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, fungibleTokenMint)).budget.toString(),
        );

        // Execute claim
        const claimMessage = await generateFungibleClaimMessage({
          claimAmount: claimAmount,
          recipient: projectOwner.publicKey,
        });
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.claim({
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            message: claimMessage,
            signatures: claimMessage.sign([globalAdmin]),
          }),
        );

        const projectCurrencyBudgetAfter = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, fungibleTokenMint)).budget.toString(),
        );

        expect(projectCurrencyBudgetBefore).to.equal(
          projectCurrencyBudgetAfter +
            claimAmount +
            (claimAmount * projectClaimFee) / BigInt(10000),
        );
      });

      it('Should fail if insufficient budget (Underflow)', async () => {
        const claimAmount =
          BigInt(
            (
              await sdk.getProjectCurrencyBudget(project.nonce, fungibleTokenMint)
            ).budget.toString(),
          ) + BigInt(1);

        // Update the claim limit to avoid running into it
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenMint: fungibleTokenMint,
            claimLimitPerCooldown: new anchor.BN(claimAmount + BigInt(1000)),
          }),
        );

        // Execute claim
        try {
          const claimMessage = await generateFungibleClaimMessage({
            claimAmount: claimAmount,
            recipient: projectOwner.publicKey,
          });

          await sendInstructions(
            svm,
            projectOwner,
            await sdk.claim({
              authority: projectOwner.publicKey,
              projectNonce: project.nonce,
              message: claimMessage,
              signatures: claimMessage.sign([globalAdmin]),
            }),
          );

          expect.fail('Should have failed with Undeflow error');
        } catch (error) {
          expect(error.error.errorCode.code).to.equal('Underflow');
        }
      });
    });

    describe('Claim Non Fungible SPL Tokens', () => {
      beforeEach(async () => {
        ({ svm, sdk } = await loadSvmSdk());
        ({ globalAdmin, globalConfig } = await loadGlobalConfigFixture({
          svm,
          sdk,
          projectClaimFee: 100,
          userNativeClaimFee: new anchor.BN(1000),
        }));
        ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

        // Add non-fungible token to the global config and deposit to project
        ({ nonFungibleTokenMint, minter } = await loadNonFungibleCurrencyTokenFixture({
          svm,
          sdk,
          globalAdmin,
        }));
        await loadNonFungibleDepositFixture({ svm, sdk, project, minter, nonFungibleTokenMint });
      });

      it('Should claim non-fungible SPL successfully', async () => {
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNonFungibleClaimMessage({ recipient });

        // Execute claim
        try {
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
        } catch {
          expect.fail('Should have claimed successfully');
        }
      });

      it('Should transfer NFT (amount must = 1)', async () => {
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNonFungibleClaimMessage({ recipient });

        // Ensure we don't have the NFT in the recipient's account
        expect(await ownsNft(svm, recipient.publicKey, nonFungibleTokenMint)).to.be.false;

        // Execute claim
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.claim({
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            message: claimMessage,
            signatures: claimMessage.sign([globalAdmin]),
          }),
        );

        // Verify the project owner now owns the NFT
        expect(await ownsNft(svm, recipient.publicKey, nonFungibleTokenMint)).to.be.true;
      });
    });

    describe('Claim Native SOL', () => {
      beforeEach(async () => {
        ({ svm, sdk } = await loadSvmSdk());
        ({ globalAdmin, globalConfig, feeCollector } = await loadGlobalConfigFixture({
          svm,
          sdk,
          projectClaimFee: 100,
          userNativeClaimFee: new anchor.BN(1000),
        }));
        ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

        // Add native token to the global config and deposit to project
        await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
        await loadNativeDepositFixture({ svm, sdk, project });
      });

      it('Should claim native SOL successfully', async () => {
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount: BigInt(1000),
          recipient: recipient,
        });

        try {
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
        } catch {
          expect.fail('Should have claimed successfully');
        }
      });

      it('Should transfer lamports to recipient', async () => {
        const claimAmount = BigInt(100); // Small amount within claim limit
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount: claimAmount,
          recipient: recipient,
        });

        // Get initial project balance (source of funds)
        const initialProjectBalance = svm.getBalance(projectPda);

        // Execute claim
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

        // Verify project balance decreased by claim amount + project claim fee
        const finalProjectBalance = svm.getBalance(projectPda);
        const projectDiff = Number(initialProjectBalance - finalProjectBalance);

        // Project pays: claim_amount + project_claim_fee (1% of claim amount)
        const globalConfig = await sdk.getGlobalConfig();
        const projectClaimFee =
          (Number(claimAmount) * Number(globalConfig.feeManagement.projectClaimFee)) / 10000;
        expect(projectDiff).to.equal(Number(claimAmount) + projectClaimFee);
      });

      it('Should decrement ProjectCurrencyBudget by (amount + project_fee)', async () => {
        const claimAmount = BigInt(100); // Small amount within claim limit
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount: claimAmount,
          recipient: recipient,
        });

        // Get initial balances - use PublicKey.default for native SOL
        const projectCurrencyBudgetBefore = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Execute claim
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

        // Verify balances changed - use PublicKey.default for native SOL
        const projectCurrencyBudgetAfter = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Budget decreases by claim_amount + project_claim_fee
        const globalConfig = await sdk.getGlobalConfig();
        const projectClaimFee =
          (claimAmount * BigInt(globalConfig.feeManagement.projectClaimFee.toString())) /
          BigInt(10000);
        expect(projectCurrencyBudgetBefore).to.equal(
          projectCurrencyBudgetAfter + claimAmount + projectClaimFee,
        );
      });

      it('Should fail if insufficient budget (Underflow)', async () => {
        const claimAmount =
          BigInt(
            (
              await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)
            ).budget.toString(),
          ) + BigInt(1);

        // Update the claim limit to avoid running into it
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenMint: PublicKey.default,
            claimLimitPerCooldown: new anchor.BN(claimAmount + BigInt(1000)),
          }),
        );

        // Execute claim
        try {
          const claimMessage = await generateNativeClaimMessage({
            claimAmount: claimAmount,
            recipient: projectOwner.publicKey,
          });

          await sendInstructions(
            svm,
            projectOwner,
            await sdk.claim({
              authority: projectOwner.publicKey,
              projectNonce: project.nonce,
              message: claimMessage,
              signatures: claimMessage.sign([globalAdmin]),
            }),
          );

          expect.fail('Should have failed with Undeflow error');
        } catch (error) {
          expect(error.error.errorCode.code).to.equal('Underflow');
        }
      });

      it('Should update user stats', async () => {
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);

        // Get initial balances - use PublicKey.default for native SOL
        const projectUserBefore = await sdk
          .getProjectUser(project.nonce, recipient.publicKey)
          .catch(() => null);
        expect(projectUserBefore).to.be.null;

        // Claim 1
        const claimMessage = await generateNativeClaimMessage({
          claimAmount: claimAmount,
          recipient: recipient,
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

        // Verify balances changed - use PublicKey.default for native SOL
        const projectUserAfter = await sdk.getProjectUser(project.nonce, recipient.publicKey);
        expect(projectUserAfter).to.not.be.null;
        expect(projectUserAfter?.totalClaims.eq(new anchor.BN(1))).to.be.true;
        expect(projectUserAfter?.totalNativeClaimed.eq(new anchor.BN(claimAmount))).to.be.true;

        // Claim 2
        const claimMessage2 = await generateNativeClaimMessage({
          claimAmount: claimAmount,
          recipient: recipient,
        });
        await sendInstructions(
          svm,
          recipient,
          await sdk.claim({
            authority: recipient.publicKey,
            projectNonce: project.nonce,
            message: claimMessage2,
            signatures: claimMessage2.sign([globalAdmin]),
          }),
        );

        const projectUserAfter2 = await sdk.getProjectUser(project.nonce, recipient.publicKey);
        expect(projectUserAfter2).to.not.be.null;
        expect(projectUserAfter2?.totalClaims.eq(new anchor.BN(2))).to.be.true;
        expect(projectUserAfter2?.totalNativeClaimed.eq(new anchor.BN(claimAmount * BigInt(2)))).to
          .be.true;
      });
    });
  });

  describe('Fee calculations', () => {
    describe('User Native Claim Fee', () => {
      const userNativeClaimFee = new anchor.BN(5000); // 5000 lamports

      beforeEach(async () => {
        ({ svm, sdk } = await loadSvmSdk());
        ({ globalAdmin, globalConfig, feeCollector } = await loadGlobalConfigFixture({
          svm,
          sdk,
          userNativeClaimFee,
        }));
        ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

        // Add native token to the global config and deposit to project
        await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
        await loadNativeDepositFixture({ svm, sdk, project });
      });

      it('Should charge user_native_claim_fee to authority (claimer)', async () => {
        const claimAmount = BigInt(100);
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Authority/recipient should have paid the user native claim fee
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);

        // Fee collector receives: user_native_claim_fee + project_claim_fee (from project)
        expect(feeCollectorDiff).to.be.gte(userNativeClaimFee.toNumber());
      });

      it('Should not deduct from claim amount (paid separately)', async () => {
        const claimAmount = BigInt(100);
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get project currency budget before
        const budgetBefore = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Execute claim
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

        // Budget should decrease by claim amount + project_claim_fee, NOT user_native_claim_fee
        const budgetAfter = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );
        const budgetDiff = budgetBefore - budgetAfter;

        // Project claim fee is 0 by default, so budget should decrease by exactly claimAmount
        expect(budgetDiff).to.equal(claimAmount);
      });

      it('Should use project override if set, else global', async () => {
        const projectUserNativeClaimFee = new anchor.BN(2000); // Override with 2000 lamports
        const claimAmount = BigInt(100);
        const recipient = await loadFundedAccount(svm);

        // Set project-specific user native claim fee
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateProjectFees({
            authority: globalAdmin.publicKey,
            projectNonce: project.nonce,
            userNativeClaimFee: projectUserNativeClaimFee,
          }),
        );

        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Fee collector should receive the project override fee (2000), not global (5000)
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);
        const feeCollectorDiff = finalFeeCollectorBalance - initialFeeCollectorBalance;

        // Should receive exactly the project override fee
        expect(feeCollectorDiff).to.equal(BigInt(projectUserNativeClaimFee.toNumber()));
      });

      it('Should exempt whitelisted addresses (no_claim_fee_whitelist)', async () => {
        const claimAmount = BigInt(100);
        const recipient = await loadFundedAccount(svm);

        // Add recipient to the no claim fee whitelist
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addNoClaimFeeWhitelist({
            authority: globalAdmin.publicKey,
            account: recipient.publicKey,
          }),
        );

        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Fee collector should NOT receive user_native_claim_fee (whitelisted)
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);

        // Should be 0 since user is whitelisted and there's no project claim fee set
        expect(feeCollectorDiff).to.equal(0);
      });
    });

    describe('Project Claim Fee', () => {
      const projectClaimFee = 500; // 500 basis points = 5%

      beforeEach(async () => {
        ({ svm, sdk } = await loadSvmSdk());
        ({ globalAdmin, globalConfig, feeCollector } = await loadGlobalConfigFixture({
          svm,
          sdk,
          projectClaimFee,
        }));
        ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

        // Add native token to the global config and deposit to project
        await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
        await loadNativeDepositFixture({ svm, sdk, project });
      });

      it('Should decrement budget by (amount + fee)', async () => {
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get budget before
        const budgetBefore = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Execute claim
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

        // Get budget after
        const budgetAfter = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Budget should decrease by claim_amount + project_claim_fee (5% of claim amount)
        const expectedFee = (claimAmount * BigInt(projectClaimFee)) / BigInt(10000);
        const expectedDeduction = claimAmount + expectedFee;
        expect(budgetBefore - budgetAfter).to.equal(expectedDeduction);
      });

      it('Should transfer fee from project to fee_collector', async () => {
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);
        const initialProjectBalance = svm.getBalance(projectPda);

        // Execute claim
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

        // Get final balances
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);
        const finalProjectBalance = svm.getBalance(projectPda);

        // Project should have paid claim_amount + project_claim_fee
        const expectedFee = (claimAmount * BigInt(projectClaimFee)) / BigInt(10000);
        const projectDiff = Number(initialProjectBalance - finalProjectBalance);
        expect(projectDiff).to.equal(Number(claimAmount + expectedFee));

        // Fee collector should have received at least the project claim fee
        // (may also receive user_native_claim_fee if set)
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);
        expect(feeCollectorDiff).to.be.gte(Number(expectedFee));
      });

      it('Should use project override if set, else global', async () => {
        const projectOverrideFee = 200; // 200 basis points = 2%
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);

        // Set project-specific claim fee
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateProjectFees({
            authority: globalAdmin.publicKey,
            projectNonce: project.nonce,
            projectClaimFee: projectOverrideFee,
          }),
        );

        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get budget before
        const budgetBefore = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Execute claim
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

        // Get budget after
        const budgetAfter = BigInt(
          (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default)).budget.toString(),
        );

        // Budget should decrease by claim_amount + project override fee (2%, not global 5%)
        const expectedFee = (claimAmount * BigInt(projectOverrideFee)) / BigInt(10000);
        const expectedDeduction = claimAmount + expectedFee;
        expect(budgetBefore - budgetAfter).to.equal(expectedDeduction);
      });

      it('Should not apply to NFT claims (fee = 0)', async () => {
        // Set up NFT token
        ({ nonFungibleTokenMint, minter } = await loadNonFungibleCurrencyTokenFixture({
          svm,
          sdk,
          globalAdmin,
        }));
        await loadNonFungibleDepositFixture({ svm, sdk, project, minter, nonFungibleTokenMint });

        const recipient = await loadFundedAccount(svm);
        const claimMessage = await generateNonFungibleClaimMessage({
          recipient,
        });

        // Get initial fee collector balance
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Fee collector should NOT receive any project claim fee for NFT claims
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);

        // Should be 0 since NFT claims don't have project claim fee
        expect(feeCollectorDiff).to.equal(0);
      });
    });

    describe('Whitelist Fee Exemption', () => {
      const userNativeClaimFee = new anchor.BN(5000); // 5000 lamports
      const projectClaimFee = 500; // 500 basis points = 5%

      beforeEach(async () => {
        ({ svm, sdk } = await loadSvmSdk());
        ({ globalAdmin, globalConfig, feeCollector } = await loadGlobalConfigFixture({
          svm,
          sdk,
          userNativeClaimFee,
          projectClaimFee,
        }));
        ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

        // Add native token to the global config and deposit to project
        await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
        await loadNativeDepositFixture({ svm, sdk, project });
      });

      it('Whitelisted authority pays no user_native_claim_fee', async () => {
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);

        // Add recipient to the no claim fee whitelist
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addNoClaimFeeWhitelist({
            authority: globalAdmin.publicKey,
            account: recipient.publicKey,
          }),
        );

        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Get final balances
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Fee collector should NOT receive user_native_claim_fee (only project_claim_fee)
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);
        const expectedProjectFee = (claimAmount * BigInt(projectClaimFee)) / BigInt(10000);
        // Fee collector should only receive project fee, not user fee
        expect(feeCollectorDiff).to.equal(Number(expectedProjectFee));
      });

      it('Non-whitelisted authority pays full user_native_claim_fee', async () => {
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);

        // Do NOT add recipient to whitelist - they should pay the full fee

        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Get final balances
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Fee collector should receive user_native_claim_fee + project_claim_fee
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);
        const expectedProjectFee = (claimAmount * BigInt(projectClaimFee)) / BigInt(10000);
        const expectedTotalFee = userNativeClaimFee.toNumber() + Number(expectedProjectFee);
        expect(feeCollectorDiff).to.equal(expectedTotalFee);
      });

      it('Project fees still apply to whitelisted authorities', async () => {
        const claimAmount = BigInt(1000);
        const recipient = await loadFundedAccount(svm);

        // Add recipient to the no claim fee whitelist
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addNoClaimFeeWhitelist({
            authority: globalAdmin.publicKey,
            account: recipient.publicKey,
          }),
        );

        const claimMessage = await generateNativeClaimMessage({
          claimAmount,
          recipient,
        });

        // Get initial balances
        const initialProjectBalance = svm.getBalance(projectPda);
        const initialFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Execute claim
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

        // Get final balances
        const finalProjectBalance = svm.getBalance(projectPda);
        const finalFeeCollectorBalance = svm.getBalance(feeCollector.publicKey);

        // Project should still pay claim_amount + project_claim_fee (whitelist doesn't exempt project fees)
        const expectedProjectFee = (claimAmount * BigInt(projectClaimFee)) / BigInt(10000);
        const projectDiff = Number(initialProjectBalance - finalProjectBalance);
        expect(projectDiff).to.equal(Number(claimAmount + expectedProjectFee));

        // Fee collector should receive project_claim_fee (but NOT user_native_claim_fee since whitelisted)
        const feeCollectorDiff = Number(finalFeeCollectorBalance - initialFeeCollectorBalance);
        expect(feeCollectorDiff).to.equal(Number(expectedProjectFee));
      });
    });
  });
});
