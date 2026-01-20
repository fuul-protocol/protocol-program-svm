import { Keypair } from '@solana/web3.js';
import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { expect } from 'chai';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from '../utils/svm';
import { GlobalRole } from '@wakeuplabs/fuul-solana/src';
import { loadGlobalConfigFixture, loadSvmSdk, loadFundedAccount } from '../utils/fixtures';

describe('Admin Roles', () => {
  let svm: LiteSVM;
  let globalAdmin, other: Keypair;
  let sdk: FuulSdk;

  describe('Grant Global Role', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
      other = await loadFundedAccount(svm);
    });

    it('should not allow the caller to grant a role if they are not the admin', async () => {
      try {
        await sendInstructions(
          svm,
          other,
          await sdk.grantGlobalRole({
            authority: other.publicKey,
            account: other.publicKey,
            role: GlobalRole.Admin,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should grant a role to an account if the caller is the admin', async () => {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.grantGlobalRole({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
          role: GlobalRole.Admin,
        }),
      );

      const globalConfig = await sdk.getGlobalConfig();
      expect(
        globalConfig?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.admin,
        ),
      ).to.not.be.undefined;
    });

    it('should fail if the account already has the role', async () => {
      // Grant the role first
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.grantGlobalRole({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
          role: GlobalRole.Admin,
        }),
      );

      // Try to grant again
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.grantGlobalRole({
            authority: globalAdmin.publicKey,
            account: other.publicKey,
            role: GlobalRole.Admin,
          }),
        );

        expect.fail('Should have failed with RoleAlreadyExists error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('RoleAlreadyExists');
      }
    });
  });

  describe('Revoke Global Role', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
      other = await loadFundedAccount(svm);
    });

    it('should not allow the caller to revoke a role if they are not the admin', async () => {
      const random = await loadFundedAccount(svm);

      try {
        await sendInstructions(
          svm,
          random,
          await sdk.revokeGlobalRole({
            authority: random.publicKey,
            account: random.publicKey,
            role: GlobalRole.Admin,
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
          globalAdmin,
          await sdk.revokeGlobalRole({
            authority: globalAdmin.publicKey,
            account: globalAdmin.publicKey,
            role: GlobalRole.Admin,
          }),
        );

        expect.fail('Should have failed with CannotRevokeSelf error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('CannotRevokeSelf');
      }
    });

    it('should revoke a role from an account if the caller is the admin', async () => {
      // First grant the role
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.grantGlobalRole({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
          role: GlobalRole.Admin,
        }),
      );

      // Then revoke it
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.revokeGlobalRole({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
          role: GlobalRole.Admin,
        }),
      );

      const globalConfig = await sdk.getGlobalConfig();
      expect(
        globalConfig?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.admin,
        ),
      ).to.be.undefined;
    });

    it('should fail when trying to revoke a role from an account that does not have it', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.revokeGlobalRole({
            authority: globalAdmin.publicKey,
            account: other.publicKey,
            role: GlobalRole.Admin,
          }),
        );

        expect.fail('Should have failed with RoleDoesNotExist error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('RoleDoesNotExist');
      }
    });
  });

  describe('Renounce Global Role', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
      other = await loadFundedAccount(svm);
    });

    it("should not allow the caller to renounce if they're the last admin", async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.renounceGlobalRole({
            authority: globalAdmin.publicKey,
            role: GlobalRole.Admin,
          }),
        );

        expect.fail('Should have failed with CannotRenounceLastAdmin error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('CannotRenounceLastAdmin');
      }
    });

    it('should remove the role from the caller if they have the role', async () => {
      // First assign role
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.grantGlobalRole({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
          role: GlobalRole.Pauser,
        }),
      );

      // Renounce role
      await sendInstructions(
        svm,
        other,
        await sdk.renounceGlobalRole({
          authority: other.publicKey,
          role: GlobalRole.Pauser,
        }),
      );

      const globalConfig = await sdk.getGlobalConfig();
      expect(
        globalConfig?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.pauser,
        ),
      ).to.be.undefined;
    });

    it('should allow renouncing admin role if caller is not the last admin', async () => {
      // Grant admin role to other
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.grantGlobalRole({
          authority: globalAdmin.publicKey,
          account: other.publicKey,
          role: GlobalRole.Admin,
        }),
      );

      // Now other can renounce their admin role since globalAdmin is also admin
      await sendInstructions(
        svm,
        other,
        await sdk.renounceGlobalRole({
          authority: other.publicKey,
          role: GlobalRole.Admin,
        }),
      );

      const globalConfig = await sdk.getGlobalConfig();
      expect(
        globalConfig?.rolesMapping.roles.find(
          (role) => role.account.equals(other.publicKey) && role.role.admin,
        ),
      ).to.be.undefined;
      // Verify globalAdmin still has admin
      expect(
        globalConfig?.rolesMapping.roles.find(
          (role) => role.account.equals(globalAdmin.publicKey) && role.role.admin,
        ),
      ).to.not.be.undefined;
    });

    it('should fail when trying to renounce a role that the caller does not have', async () => {
      try {
        await sendInstructions(
          svm,
          other,
          await sdk.renounceGlobalRole({
            authority: other.publicKey,
            role: GlobalRole.Pauser,
          }),
        );

        expect.fail('Should have failed with RoleDoesNotExist error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('RoleDoesNotExist');
      }
    });
  });
});
