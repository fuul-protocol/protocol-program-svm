import { Keypair } from '@solana/web3.js';
import { FuulSdk, Project, ProjectRole } from '@wakeuplabs/fuul-solana';
import { expect } from 'chai';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from '../utils/svm';
import {
  loadGlobalConfigFixture,
  loadProjectFixture,
  loadSvmSdk,
  loadFundedAccount,
} from '../utils/fixtures';

describe('Project Roles', () => {
  let svm: LiteSVM;
  let projectOwner: Keypair;
  let sdk: FuulSdk;
  let project: Project;

  describe('Grant Project Role', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      await loadGlobalConfigFixture({ svm, sdk });
      ({ project, projectOwner } = await loadProjectFixture({ svm, sdk }));
    });

    it('should not allow the caller to grant a role if they are not the admin', async () => {
      const other = await loadFundedAccount(svm);

      try {
        await sendInstructions(
          svm,
          other,
          await sdk.grantProjectRole({
            authority: other.publicKey,
            projectNonce: project.nonce,
            account: other.publicKey,
            role: ProjectRole.Admin,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should grant a role to an account if the caller is the admin', async () => {
      const other = await loadFundedAccount(svm);

      await sendInstructions(
        svm,
        projectOwner,
        await sdk.grantProjectRole({
          authority: projectOwner.publicKey,
          projectNonce: project.nonce,
          account: other.publicKey,
          role: ProjectRole.Admin,
        }),
      );

      const projectAfter = await sdk.getProject(project.nonce);
      expect(
        projectAfter?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.admin,
        ),
      ).to.not.be.undefined;
    });
  });

  describe('Revoke Project Role', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      await loadGlobalConfigFixture({ svm, sdk });
      ({ project, projectOwner } = await loadProjectFixture({ svm, sdk }));
    });

    it('should not allow the caller to revoke a role if they are not the admin', async () => {
      const other = await loadFundedAccount(svm);

      try {
        await sendInstructions(
          svm,
          other,
          await sdk.revokeProjectRole({
            authority: other.publicKey,
            projectNonce: project.nonce,
            account: other.publicKey,
            role: ProjectRole.Admin,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should not allow the caller to revoke themselves, they must use renounceRole', async () => {
      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.revokeProjectRole({
            authority: projectOwner.publicKey,
            account: projectOwner.publicKey,
            role: ProjectRole.Admin,
            projectNonce: project.nonce,
          }),
        );

        expect.fail('Should have failed with CannotRevokeSelf error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('CannotRevokeSelf');
      }
    });

    it('should revoke a role from an account if the caller is the admin', async () => {
      const other = await loadFundedAccount(svm);

      // First grant the role
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.grantProjectRole({
          authority: projectOwner.publicKey,
          account: other.publicKey,
          role: ProjectRole.Admin,
          projectNonce: project.nonce,
        }),
      );

      // Then revoke it
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.revokeProjectRole({
          authority: projectOwner.publicKey,
          account: other.publicKey,
          role: ProjectRole.Admin,
          projectNonce: project.nonce,
        }),
      );

      const projectAfter = await sdk.getProject(project.nonce);
      expect(
        projectAfter?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.admin,
        ),
      ).to.be.undefined;
    });

    it('should fail when trying to revoke a role from an account that does not have it', async () => {
      const other = await loadFundedAccount(svm);

      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.revokeProjectRole({
            authority: projectOwner.publicKey,
            account: other.publicKey,
            role: ProjectRole.Admin,
            projectNonce: project.nonce,
          }),
        );

        expect.fail('Should have failed with RoleDoesNotExist error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('RoleDoesNotExist');
      }
    });
  });

  describe('Renounce Project Role', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      await loadGlobalConfigFixture({ svm, sdk });
      ({ project, projectOwner } = await loadProjectFixture({ svm, sdk }));
    });

    it("should not allow the caller to renounce if they're the last admin", async () => {
      try {
        await sendInstructions(
          svm,
          projectOwner,
          await sdk.renounceProjectRole({
            authority: projectOwner.publicKey,
            role: ProjectRole.Admin,
            projectNonce: project.nonce,
          }),
        );

        expect.fail('Should have failed with CannotRenounceLastAdmin error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('CannotRenounceLastAdmin');
      }
    });

    it('should remove the role from the caller if they have the role', async () => {
      const other = await loadFundedAccount(svm);

      // First assign role
      await sendInstructions(
        svm,
        projectOwner,
        await sdk.grantProjectRole({
          authority: projectOwner.publicKey,
          account: other.publicKey,
          role: ProjectRole.Admin,
          projectNonce: project.nonce,
        }),
      );

      // Renounce role
      await sendInstructions(
        svm,
        other,
        await sdk.renounceProjectRole({
          authority: other.publicKey,
          role: ProjectRole.Admin,
          projectNonce: project.nonce,
        }),
      );

      const projectAfter = await sdk.getProject(project.nonce);
      expect(
        projectAfter?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.admin,
        ),
      ).to.be.undefined;
    });

    it('should fail when trying to renounce a role that the caller does not have', async () => {
      const other = await loadFundedAccount(svm);

      try {
        await sendInstructions(
          svm,
          other,
          await sdk.renounceProjectRole({
            authority: other.publicKey,
            role: ProjectRole.Admin,
            projectNonce: project.nonce,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });
  });
});
