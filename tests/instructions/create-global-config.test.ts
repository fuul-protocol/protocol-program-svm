import { Keypair, PublicKey } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { expect } from 'chai';
import { LiteSVM } from 'litesvm';
import {
  INITIAL_CLAIM_COOLDOWN,
  INITIAL_USER_NATIVE_CLAIM_FEE,
  INITIAL_PROJECT_CLAIM_FEE,
  INITIAL_REMOVE_FEE,
  INITIAL_REQUIRED_SIGNERS_FOR_CLAIM,
} from '../utils/constants';
import { sendInstructions } from '../utils/svm';
import { loadFundedAccount, loadSvmSdk } from '../utils/fixtures';

describe('Create Global Config', () => {
  let svm: LiteSVM;
  let sdk: FuulSdk;
  let globalAdmin: Keypair;
  let signer: Keypair;

  beforeEach(async () => {
    ({ svm, sdk } = await loadSvmSdk());
    globalAdmin = await loadFundedAccount(svm);
    signer = await loadFundedAccount(svm);
  });

  it('should not create the global config if initial fee collector is the default pubkey', async () => {
    try {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.createGlobalConfig({
          authority: globalAdmin.publicKey,
          feeCollector: PublicKey.default,
          initialSigner: signer.publicKey,
        }),
      );

      expect.fail('Should have failed with ZeroValueNotAllowed error');
    } catch (error) {
      expect(error.error.errorCode.code).to.be.eq('ZeroValueNotAllowed');
    }
  });

  it('should not create the global config if initial signer is the default pubkey', async () => {
    try {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.createGlobalConfig({
          authority: globalAdmin.publicKey,
          feeCollector: globalAdmin.publicKey,
          initialSigner: PublicKey.default,
        }),
      );

      expect.fail('Should have failed with ZeroValueNotAllowed error');
    } catch (error) {
      expect(error.error.errorCode.code).to.be.eq('ZeroValueNotAllowed');
    }
  });

  it('should initialize the global config just once', async () => {
    await sendInstructions(
      svm,
      globalAdmin,
      await sdk.createGlobalConfig({
        authority: globalAdmin.publicKey,
        feeCollector: globalAdmin.publicKey,
        initialSigner: signer.publicKey,
      }),
    );

    const globalConfig = await sdk.getGlobalConfig();

    // check global variables
    expect(globalConfig.claimCoolDown.eq(INITIAL_CLAIM_COOLDOWN)).to.be.true;
    expect(globalConfig.requiredSignersForClaim).to.equal(INITIAL_REQUIRED_SIGNERS_FOR_CLAIM);

    // check fee management
    expect(globalConfig.feeManagement.feeCollector.equals(globalAdmin.publicKey)).to.be.true;
    expect(globalConfig.feeManagement.userNativeClaimFee.eq(INITIAL_USER_NATIVE_CLAIM_FEE)).to.be
      .true;
    expect(globalConfig.feeManagement.projectClaimFee).to.equal(INITIAL_PROJECT_CLAIM_FEE);
    expect(globalConfig.feeManagement.removeFee).to.equal(INITIAL_REMOVE_FEE);

    // check roles - authority should have Admin, Pauser, Unpauser; signer should have Signer role
    expect(globalConfig.rolesMapping.roles.length).to.equal(4);

    // Verify authority has Admin, Pauser, Unpauser but NOT Signer
    const authorityRoles = globalConfig.rolesMapping.roles.filter((r) =>
      r.account.equals(globalAdmin.publicKey),
    );
    expect(authorityRoles.length).to.equal(3);
    expect(authorityRoles.some((r) => r.role.admin)).to.be.true;
    expect(authorityRoles.some((r) => r.role.pauser)).to.be.true;
    expect(authorityRoles.some((r) => r.role.unpauser)).to.be.true;
    expect(authorityRoles.some((r) => r.role.signer)).to.be.false;

    // Verify signer has only the Signer role
    const signerRoles = globalConfig.rolesMapping.roles.filter((r) =>
      r.account.equals(signer.publicKey),
    );
    expect(signerRoles.length).to.equal(1);
    expect(signerRoles[0].role.signer).to.not.be.undefined;

    try {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.createGlobalConfig({
          authority: globalAdmin.publicKey,
          feeCollector: new PublicKey(1),
          initialSigner: signer.publicKey,
        }),
      );

      expect.fail('Should have failed with AlreadyInitialized error');
    } catch (error) {
      expect(error).to.exist;
    }
  });
});
