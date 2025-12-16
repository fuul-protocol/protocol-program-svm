import * as anchor from '@coral-xyz/anchor';
import { FuulSdk, Project } from '@wakeuplabs/fuul-solana';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from '../utils/svm';
import { expect } from 'chai';
import { loadGlobalConfigFixture, loadProjectFixture, loadSvmSdk } from '../utils/fixtures';

describe('Project', () => {
  let svm: LiteSVM;
  let sdk: FuulSdk;
  let project: Project;
  let globalAdmin, projectOwner;

  describe('Update Project Fees', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
      ({ project, projectOwner } = await loadProjectFixture({ svm, sdk }));
    });

    it('should fail if the signer is not a global admin, even if it is the project admin', async () => {
      try {
        const value = 1000;

        await sendInstructions(
          svm,
          projectOwner,
          await sdk.updateProjectFees({
            authority: projectOwner.publicKey,
            projectNonce: project.nonce,
            userNativeClaimFee: new anchor.BN(value),
            projectClaimFee: value,
            removeFee: value,
          }),
        );
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should update the project fees', async () => {
      const value = 2000;
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.updateProjectFees({
          authority: globalAdmin.publicKey,
          projectNonce: project.nonce,
          userNativeClaimFee: new anchor.BN(value),
          projectClaimFee: value,
          removeFee: value,
        }),
      );

      const projectAfter = await sdk.getProject(project.nonce);
      expect(projectAfter!.feeManagement.userNativeClaimFee.eq(new anchor.BN(value))).to.be.true;
      expect(projectAfter!.feeManagement.projectClaimFee).to.equal(value);
      expect(projectAfter!.feeManagement.removeFee).to.equal(value);
    });
  });
});
