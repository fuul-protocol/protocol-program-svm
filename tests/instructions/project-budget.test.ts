import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { FuulSdk, Project } from '@wakeuplabs/fuul-solana';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from '../utils/svm';
import {
  createNonFungibleToken,
  getSplTokenBalance,
  mintFungibleTokenTo,
  mintNonFungibleTokenTo,
  ownsNft,
} from '../utils/spl';
import { expect } from 'chai';
import {
  loadFungibleCurrencyTokenFixture,
  loadFungibleDepositFixture,
  loadGlobalConfigFixture,
  loadNativeCurrencyTokenFixture,
  loadNativeDepositFixture,
  loadNonFungibleCurrencyTokenFixture,
  loadProjectFixture,
  loadSvmSdk,
  loadFundedAccount,
} from '../utils/fixtures';

describe('Project Budget', () => {
  let svm: LiteSVM;
  let globalAdmin, feeCollector, projectOwner, minter: Keypair;
  let sdk: FuulSdk;
  let fungibleTokenMint, nonFungibleTokenMint: PublicKey;
  let project: Project;
  let projectPda: PublicKey;

  describe('Deposit Fungible Token', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin, feeCollector } = await loadGlobalConfigFixture({ svm, sdk }));
      ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

      // Enable tokens in global config
      await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
      ({ fungibleTokenMint, minter } = await loadFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      }));
    });

    it('should fail when depositing zero amount', async () => {
      const amount = new anchor.BN(0);

      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.depositFungibleToken({
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            tokenMint: PublicKey.default,
            amount,
          }),
        );

        expect.fail('Should have thrown an error for zero amount');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('ZeroValueNotAllowed');
      }
    });

    it('should fail when depositing spl tokens without sufficient balance', async () => {
      const amount = BigInt(1_000_000_000_000_000); // Very large amount

      // verify owner balance is minor
      const ownerBalance = svm.getBalance(projectOwner.publicKey);
      expect(ownerBalance < amount).to.be.true;

      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.depositFungibleToken({
            amount: new anchor.BN(amount),
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            tokenMint: fungibleTokenMint,
          }),
        );

        expect.fail('Should have thrown an error for insufficient balance');
      } catch (error) {
        expect(String(error)).to.include('insufficient funds');
      }
    });

    it('should deposit spl fungible token into the project', async () => {
      const amount = new anchor.BN(1_000);
      const depositer = await loadFundedAccount(svm);

      // Mint tokens to depositer
      await mintFungibleTokenTo({
        svm,
        mint: fungibleTokenMint,
        minter,
        destination: depositer.publicKey,
        amount: amount.toNumber(),
      });

      // Project account balance before deposit
      const projectAccountBefore = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        projectPda,
        true,
      );

      // Owner balance before deposit
      const ownerBalanceBefore = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        depositer.publicKey,
        false,
      );
      expect(ownerBalanceBefore).to.not.be.null;

      // Deposit
      await sendInstructions(
        svm,
        depositer,
        await sdk.depositFungibleToken({
          amount,
          authority: depositer.publicKey,
          projectNonce: project.nonce,
          tokenMint: fungibleTokenMint,
        }),
      );

      // Check project currency budget was incremented
      const projectCurrencyBudget = await sdk.getProjectCurrencyBudget(
        project.nonce,
        fungibleTokenMint,
      );
      expect(projectCurrencyBudget.budget.eq(amount)).to.be.true;

      // Check project account balance was incremented
      const projectAccountAfter = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        projectPda,
        true,
      );
      expect(projectAccountAfter - projectAccountBefore).to.equal(BigInt(amount.toNumber()));
    });

    it('Should deposit native tokens into the project', async () => {
      const amount = new anchor.BN(1_000);
      const depositer = await loadFundedAccount(svm);

      // Project account balance before deposit
      const projectAccountBefore = await svm.getBalance(projectPda);
      expect(projectAccountBefore).to.not.be.null;

      // Owner balance before deposit
      const ownerBalanceBefore = await svm.getBalance(depositer.publicKey);
      expect(ownerBalanceBefore).to.not.be.null;

      // Deposit
      await sendInstructions(
        svm,
        depositer,
        await sdk.depositFungibleToken({
          amount,
          authority: depositer.publicKey,
          projectNonce: project.nonce,
          tokenMint: PublicKey.default,
        }),
      );

      // Check project currency budget was incremented
      const projectCurrencyBudget = await sdk.getProjectCurrencyBudget(
        project.nonce,
        PublicKey.default,
      );
      expect(projectCurrencyBudget.budget.eq(amount)).to.be.true;

      // Check project account balance was incremented
      const projectAccountAfter = await svm.getBalance(projectPda);
      expect(projectAccountAfter - projectAccountBefore).to.equal(BigInt(amount.toNumber()));
    });
  });

  describe('Remove Fungible Token', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin, feeCollector } = await loadGlobalConfigFixture({ svm, sdk }));
      ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

      // Enable tokens in global config
      await loadNativeCurrencyTokenFixture({ svm, sdk, globalAdmin });
      ({ fungibleTokenMint, minter } = await loadFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      }));

      // Deposit tokens for remove tests
      await loadFungibleDepositFixture({
        svm,
        sdk,
        project,
        minter,
        fungibleTokenMint,
        amount: 10_000,
      });
      await loadNativeDepositFixture({ svm, sdk, project, amount: 10_000 });
    });

    it('should fail if amount is zero', async () => {
      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.removeFungibleToken({
            amount: new anchor.BN(0),
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            tokenMint: fungibleTokenMint,
          }),
        );
        expect.fail('Should have thrown an error for zero amount');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('ZeroValueNotAllowed');
      }
    });

    it('should fail to remove if amount is bigger than the available budget', async () => {
      const amount = new anchor.BN('1000000000000000000');

      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.removeFungibleToken({
            amount,
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            tokenMint: fungibleTokenMint,
          }),
        );

        expect.fail('Should have thrown Underflow error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Underflow');
      }
    });

    it('should remove spl budget and transfer fee to collector', async () => {
      const amount = new anchor.BN(1_000);

      // get budget before
      const projectCurrencyBudgetBefore = BigInt(
        (await sdk.getProjectCurrencyBudget(project.nonce, fungibleTokenMint))?.budget.toString() ??
          '0',
      );

      // get project and owner balances before
      const projectAccountBefore = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        projectPda,
        true,
      );
      const ownerBalanceBefore = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        projectOwner.publicKey,
        false,
      );
      const feeCollectorBalanceBefore = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        feeCollector.publicKey,
        false,
      );

      // Get the remove fee rate from global config
      const globalConfig = await sdk.getGlobalConfig();
      const removeFeeRate = BigInt(globalConfig.feeManagement.removeFee.toString());
      const expectedFee = (removeFeeRate * BigInt(amount.toString())) / BigInt(10000);
      const expectedAmountAfterFee = BigInt(amount.toString()) - expectedFee;

      // remove amount from budget
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.removeFungibleToken({
          amount,
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          tokenMint: fungibleTokenMint,
        }),
      );

      // check budget was reduced by the full amount
      const projectCurrencyBudgetAfter = BigInt(
        (await sdk.getProjectCurrencyBudget(project.nonce, fungibleTokenMint))?.budget.toString() ??
          '0',
      );
      expect(projectCurrencyBudgetBefore - projectCurrencyBudgetAfter).to.equal(
        BigInt(amount.toString()),
      );

      // check project account balance was decremented by full amount
      const projectAccountAfter = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        projectPda,
        true,
      );
      expect(projectAccountBefore - projectAccountAfter).to.equal(BigInt(amount.toString()));

      // check owner balance was incremented by amount after fee
      const ownerBalanceAfter = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        projectOwner.publicKey,
        false,
      );
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedAmountAfterFee);

      // check fee collector received the fee
      const feeCollectorBalanceAfter = await getSplTokenBalance(
        svm,
        fungibleTokenMint,
        feeCollector.publicKey,
        false,
      );
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
    });

    it('should remove native tokens from the project and transfer fee to collector', async () => {
      const amount = new anchor.BN(1_000);

      // get budget before
      const projectCurrencyBudgetBefore = BigInt(
        (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default))?.budget.toString() ??
          '0',
      );

      // get project, owner, and fee collector balances before
      const projectAccountBefore = await svm.getBalance(projectPda);
      const feeCollectorBalanceBefore = await svm.getBalance(feeCollector.publicKey);

      // Get the remove fee rate from global config
      const globalConfig = await sdk.getGlobalConfig();
      const removeFeeRate = BigInt(globalConfig.feeManagement.removeFee.toString());
      const expectedFee = (removeFeeRate * BigInt(amount.toString())) / BigInt(10000);

      // remove amount from budget
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.removeFungibleToken({
          amount,
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          tokenMint: PublicKey.default,
        }),
      );

      // check budget was reduced
      const projectCurrencyBudgetAfter = BigInt(
        (await sdk.getProjectCurrencyBudget(project.nonce, PublicKey.default))?.budget.toString() ??
          '0',
      );
      expect(projectCurrencyBudgetBefore - projectCurrencyBudgetAfter).to.equal(
        BigInt(amount.toString()),
      );

      // check project account balance was decremented by full amount
      const projectAccountAfter = await svm.getBalance(projectPda);
      expect(projectAccountBefore - projectAccountAfter).to.equal(BigInt(amount.toString()));

      // check fee collector received the fee
      const feeCollectorBalanceAfter = await svm.getBalance(feeCollector.publicKey);
      expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
    });
  });

  describe('Deposit Non Fungible Token', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
      ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

      // Enable tokens in global config
      ({ nonFungibleTokenMint, minter } = await loadNonFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      }));
    });

    it('should successfully deposit a single NFT to the project', async () => {
      // Mint the NFT to the project owner
      await mintNonFungibleTokenTo({
        svm,
        mint: nonFungibleTokenMint,
        minter,
        destination: projectOwner.publicKey,
      });

      // Verify the project owner has the NFT
      const balanceBefore = await getSplTokenBalance(
        svm,
        nonFungibleTokenMint,
        projectOwner.publicKey,
      );
      expect(balanceBefore).to.equal(BigInt(1));

      // Deposit the NFT to the project
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.depositNonFungibleToken({
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          tokenMint: nonFungibleTokenMint,
        }),
      );

      // Verify the NFT was transferred
      const projectOwnerBalanceAfter = await getSplTokenBalance(
        svm,
        nonFungibleTokenMint,
        projectOwner.publicKey,
      );
      const projectBalanceAfter = await getSplTokenBalance(
        svm,
        nonFungibleTokenMint,
        projectPda,
        true,
      );

      expect(projectOwnerBalanceAfter).to.equal(BigInt(0));
      expect(projectBalanceAfter).to.equal(BigInt(1));
    });

    it('should fail when trying to deposit NFT from an account without the NFT', async () => {
      const other = await loadFundedAccount(svm);

      try {
        expect(await ownsNft(svm, other.publicKey, nonFungibleTokenMint)).to.be.false;

        await sendInstructions(
          svm,
          other,
          await sdk.depositNonFungibleToken({
            authority: other.publicKey,
            projectNonce: project.nonce,
            tokenMint: nonFungibleTokenMint,
          }),
        );

        expect.fail('Should have failed');
      } catch (error) {
        // May fail with AccountNotInitialized (ATA doesn't exist) or InsufficientBalance
        expect(['AccountNotInitialized', 'InsufficientBalance']).to.include(
          error.error.errorCode.code,
        );
      }
    });
  });

  describe('Remove Non Fungible Token', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
      ({ project, projectPda, projectOwner } = await loadProjectFixture({ svm, sdk }));

      // Enable tokens in global config
      ({ nonFungibleTokenMint, minter } = await loadNonFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      }));
    });

    it('should successfully remove a single NFT from the project', async () => {
      // Mint the NFT to the project owner
      await mintNonFungibleTokenTo({
        svm,
        mint: nonFungibleTokenMint,
        minter,
        destination: projectOwner.publicKey,
      });

      // Deposit the NFT to the project first
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.depositNonFungibleToken({
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          tokenMint: nonFungibleTokenMint,
        }),
      );

      // Verify the NFT was transferred to the project
      const [projectBalanceBefore, ownerBalanceBefore] = await Promise.all([
        getSplTokenBalance(svm, nonFungibleTokenMint, projectPda, true),
        getSplTokenBalance(svm, nonFungibleTokenMint, projectOwner.publicKey),
      ]);

      // Now remove the NFT from the project
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.removeNonFungibleToken({
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          tokenMint: nonFungibleTokenMint,
        }),
      );

      // Verify the NFT was transferred back to the owner
      const [projectBalanceAfter, ownerBalanceAfter] = await Promise.all([
        getSplTokenBalance(svm, nonFungibleTokenMint, projectPda, true),
        getSplTokenBalance(svm, nonFungibleTokenMint, projectOwner.publicKey),
      ]);
      expect(projectBalanceAfter).to.equal(projectBalanceBefore - BigInt(1));
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + BigInt(1));
    });

    it('should fail when trying to remove NFT if not a project admin', async () => {
      const other = await loadFundedAccount(svm);

      // Mint the NFT to the project owner and deposit to project
      await mintNonFungibleTokenTo({
        svm,
        mint: nonFungibleTokenMint,
        minter,
        destination: projectOwner.publicKey,
      });
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.depositNonFungibleToken({
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          tokenMint: nonFungibleTokenMint,
        }),
      );

      try {
        // Try to remove as non-admin
        await sendInstructions(
          svm,
          other,
          await sdk.removeNonFungibleToken({
            authority: other.publicKey,
            projectNonce: project.nonce,
            tokenMint: nonFungibleTokenMint,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.equal('Unauthorized');
      }
    });

    it('should fail when trying to remove NFT that was never deposited', async () => {
      // Create an NFT
      const nftMint = await createNonFungibleToken(svm, projectOwner);

      // Don't deposit the NFT, just try to remove it
      // Should fail because the budget account doesn't exist
      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.removeNonFungibleToken({
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            tokenMint: nftMint,
          }),
        );

        expect.fail('Should have failed with AccountNotInitialized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.equal('AccountNotInitialized');
      }
    });
  });
});
