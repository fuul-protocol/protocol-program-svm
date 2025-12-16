import * as anchor from '@coral-xyz/anchor';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { FuulSdk, Network } from '@wakeuplabs/fuul-solana';
import { fromWorkspace, LiteSVMProvider } from 'anchor-litesvm';
import { expect } from 'chai';
import { LiteSVM } from 'litesvm';
import {
  INITIAL_CLAIM_COOLDOWN,
  INITIAL_USER_NATIVE_CLAIM_FEE,
  INITIAL_PROJECT_CLAIM_FEE,
  INITIAL_REMOVE_FEE,
} from '../utils/constants';
import { sendInstructions } from '../utils/svm';
import { loadGlobalConfigFixture } from '../utils/fixtures';

describe('Admin', () => {
  let svm: LiteSVM;
  let provider: LiteSVMProvider;
  let globalAdmin, other: Keypair;
  let sdk: FuulSdk;

  before(async () => {
    svm = fromWorkspace('./')
      .withBuiltins()
      .withSysvars()
      .withDefaultPrograms()
      .withPrecompiles()
      .withTransactionHistory(BigInt(0));

    provider = new LiteSVMProvider(svm);
    anchor.setProvider(provider);

    // initialize the Fuul SDK
    sdk = new FuulSdk(provider.connection, Network.LOCALHOST);

    // create a global config
    ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));

    // create and fund a random account to test admin permissions
    other = Keypair.generate();
    svm.airdrop(other.publicKey, BigInt(10 * LAMPORTS_PER_SOL));
  });

  describe('Permissions', () => {
    it('should not allow the caller to update the global config if they are not the admin', async () => {
      try {
        await sendInstructions(
          svm,
          other,
          await sdk.updateGlobalConfig({
            authority: other.publicKey,
            claimCoolDown: new anchor.BN(100),
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should not allow the caller to update the fees if they are not the admin', async () => {
      try {
        await sendInstructions(
          svm,
          other,
          await sdk.updateGlobalConfigFees({
            authority: other.publicKey,
            userNativeClaimFee: new anchor.BN(100),
            projectClaimFee: 100,
            removeFee: 100,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');

        const globalConfig = await sdk.getGlobalConfig();
        expect(globalConfig.feeManagement.userNativeClaimFee.eq(INITIAL_USER_NATIVE_CLAIM_FEE)).to
          .be.true;
        expect(globalConfig.feeManagement.projectClaimFee).to.equal(INITIAL_PROJECT_CLAIM_FEE);
        expect(globalConfig.feeManagement.removeFee).to.equal(INITIAL_REMOVE_FEE);
      }
    });

    it('should not allow the caller to pause the program if they are not the pauser', async () => {
      try {
        await sendInstructions(svm, other, await sdk.pauseProgram({ authority: other.publicKey }));

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });
  });

  describe('Update Global Config', () => {
    it('should revert if values are provided but they are the same as the current ones', async () => {
      try {
        const globalConfig = await sdk.getGlobalConfig();
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateGlobalConfig({
            authority: globalAdmin.publicKey,
            claimCoolDown: globalConfig.claimCoolDown,
          }),
        );

        expect.fail('Should have failed with NoNewChanges error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('NoNewChanges');
      }
    });

    it('should not allow for claim_cool_down to be set to 0', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateGlobalConfig({
            authority: globalAdmin.publicKey,
            claimCoolDown: new anchor.BN(0),
          }),
        );

        expect.fail('Should have failed with ZeroValueNotAllowed error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('ZeroValueNotAllowed');
      }
    });

    it('should update the global config if the caller is the admin', async () => {
      const globalConfig = await sdk.getGlobalConfig();
      expect(globalConfig.claimCoolDown.eq(INITIAL_CLAIM_COOLDOWN)).to.be.true;

      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.updateGlobalConfig({
          authority: globalAdmin.publicKey,
          claimCoolDown: new anchor.BN(100),
        }),
      );

      const newGlobalConfig = await sdk.getGlobalConfig();
      expect(newGlobalConfig.claimCoolDown.eq(new anchor.BN(100))).to.be.true;
    });
  });

  describe('Update Global Config Fees', () => {
    it('should not allow a batch update if no new values are provided', async () => {
      const globalConfig = await sdk.getGlobalConfig();
      expect(globalConfig.feeManagement.userNativeClaimFee.eq(INITIAL_USER_NATIVE_CLAIM_FEE)).to.be
        .true;
      expect(globalConfig.feeManagement.removeFee).to.equal(INITIAL_REMOVE_FEE);

      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateGlobalConfigFees({
            authority: globalAdmin.publicKey,
            removeFee: INITIAL_REMOVE_FEE,
          }),
        );

        expect.fail('Should have failed with NoNewChanges error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('NoNewChanges');
      }
    });

    it("should revert if value is provided but it's the same as the current one", async () => {
      try {
        const globalConfig = await sdk.getGlobalConfig();
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateGlobalConfig({
            authority: globalAdmin.publicKey,
            claimCoolDown: globalConfig.claimCoolDown,
          }),
        );

        expect.fail('Should have failed with NoNewChanges error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('NoNewChanges');
      }
    });

    it('should update the fees if the caller is the admin allowing for partial updates', async () => {
      const globalConfig = await sdk.getGlobalConfig();
      expect(globalConfig.feeManagement.userNativeClaimFee.eq(INITIAL_USER_NATIVE_CLAIM_FEE)).to.be
        .true;
      expect(globalConfig.feeManagement.removeFee).to.equal(INITIAL_REMOVE_FEE);

      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.updateGlobalConfigFees({
          authority: globalAdmin.publicKey,
          userNativeClaimFee: new anchor.BN(100),
          projectClaimFee: 100,
          removeFee: 100,
        }),
      );

      const newGlobalConfig = await sdk.getGlobalConfig();
      expect(
        newGlobalConfig.feeManagement.feeCollector.equals(globalConfig.feeManagement.feeCollector),
      ).to.be.true;
      expect(newGlobalConfig.feeManagement.userNativeClaimFee.eq(new anchor.BN(100))).to.be.true;
      expect(newGlobalConfig.feeManagement.projectClaimFee).to.equal(100);
      expect(newGlobalConfig.feeManagement.removeFee).to.equal(100);
    });
  });

  describe('Pause Program', () => {
    it('should pause the program if the caller has permission to do so', async () => {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.pauseProgram({ authority: globalAdmin.publicKey }),
      );

      const newGlobalConfig = await sdk.getGlobalConfig();
      expect(newGlobalConfig.paused).to.equal(true);
    });

    it('should revert if the program is already paused', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.pauseProgram({ authority: globalAdmin.publicKey }),
        );

        expect.fail('Should have failed with NoNewChanges error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('NoNewChanges');
      }
    });

    it('should unpause the program if the caller has permission to do so', async () => {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.unpauseProgram({ authority: globalAdmin.publicKey }),
      );

      const newGlobalConfig = await sdk.getGlobalConfig();
      expect(newGlobalConfig.paused).to.equal(false);
    });

    it('should revert if the program is already unpaused', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.unpauseProgram({ authority: globalAdmin.publicKey }),
        );

        expect.fail('Should have failed with NoNewChanges error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('NoNewChanges');
      }
    });
  });

  describe('No Claim Fee Whitelist', () => {
    it('should not allow non-admins to add to whitelist', async () => {
      try {
        await sendInstructions(
          svm,
          other,
          await sdk.addNoClaimFeeWhitelist({
            authority: other.publicKey,
            account: other.publicKey,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should not allow non-admins to remove from whitelist', async () => {
      try {
        await sendInstructions(
          svm,
          other,
          await sdk.removeNoClaimFeeWhitelist({
            authority: other.publicKey,
            account: other.publicKey,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should add a wallet to the no claim fee whitelist', async () => {
      const globalConfigBefore = await sdk.getGlobalConfig();
      expect(globalConfigBefore.feeManagement.noClaimFeeWhitelist.length).to.equal(0);

      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.addNoClaimFeeWhitelist({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
        }),
      );

      const globalConfigAfter = await sdk.getGlobalConfig();
      expect(globalConfigAfter.feeManagement.noClaimFeeWhitelist.length).to.equal(1);
      expect(globalConfigAfter.feeManagement.noClaimFeeWhitelist[0].equals(other.publicKey)).to.be
        .true;
    });

    it('should fail if the wallet is already in the whitelist', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addNoClaimFeeWhitelist({
            authority: globalAdmin.publicKey,
            account: other.publicKey,
          }),
        );

        expect.fail('Should have failed with AlreadyInWhitelist error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('AlreadyInWhitelist');
      }
    });

    it('should remove a wallet from the no claim fee whitelist', async () => {
      const globalConfigBefore = await sdk.getGlobalConfig();
      expect(globalConfigBefore.feeManagement.noClaimFeeWhitelist.length).to.equal(1);

      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.removeNoClaimFeeWhitelist({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
        }),
      );

      const globalConfigAfter = await sdk.getGlobalConfig();
      expect(globalConfigAfter.feeManagement.noClaimFeeWhitelist.length).to.equal(0);
    });

    it('should fail if the wallet is not in the whitelist', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.removeNoClaimFeeWhitelist({
            authority: globalAdmin.publicKey,
            account: other.publicKey,
          }),
        );

        expect.fail('Should have failed with NotInWhitelist error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('NotInWhitelist');
      }
    });
  });
});
