import * as anchor from '@coral-xyz/anchor';
import { FuulSdk, GlobalConfig } from '@wakeuplabs/fuul-solana';
import { expect } from 'chai';
import { LiteSVM } from 'litesvm';
import { sendInstructions } from '../utils/svm';
import { loadFundedAccount, loadGlobalConfigFixture, loadSvmSdk } from '../utils/fixtures';

describe('Create Project', () => {
  let svm: LiteSVM;
  let sdk: FuulSdk;
  let globalConfig: GlobalConfig;

  beforeEach(async () => {
    ({ svm, sdk } = await loadSvmSdk());
    ({ globalConfig } = await loadGlobalConfigFixture({ svm, sdk }));
  });

  it('anyone can create a project', async () => {
    const random = await loadFundedAccount(svm);

    await sendInstructions(
      svm,
      random,
      await sdk.createProject({
        authority: random.publicKey,
        projectAdmin: random.publicKey,
      }),
    );

    const project = await sdk.getProject(new anchor.BN(0));
    expect(project.nonce.eq(new anchor.BN(0))).to.be.true;
  });

  it('should increment the project nonce', async () => {
    const random = await loadFundedAccount(svm);

    await sendInstructions(
      svm,
      random,
      await sdk.createProject({
        authority: random.publicKey,
        projectAdmin: random.publicKey,
      }),
    );

    const newGlobalConfig = await sdk.getGlobalConfig();
    expect(newGlobalConfig.projectNonce.eq(globalConfig.projectNonce.add(new anchor.BN(1)))).to.be
      .true;
  });
});
