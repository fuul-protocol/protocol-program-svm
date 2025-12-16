import * as anchor from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { FuulSdk, TokenType, TokenTypeAnchor } from '@wakeuplabs/fuul-solana';
import { expect } from 'chai';
import { LiteSVM } from 'litesvm';
import { createFungibleToken } from '../utils/spl';
import { sendInstructions } from '../utils/svm';
import {
  loadFungibleCurrencyTokenFixture,
  loadGlobalConfigFixture,
  loadSvmSdk,
  loadFundedAccount,
} from '../utils/fixtures';

describe('Admin Currencies', () => {
  let svm: LiteSVM;
  let globalAdmin: Keypair;
  let sdk: FuulSdk;

  describe('Permissions', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
    });

    it('should not allow the caller to add a new currency token if they are not the admin', async () => {
      const other = await loadFundedAccount(svm);

      try {
        await sendInstructions(
          svm,
          other,
          await sdk.addCurrencyToken({
            authority: other.publicKey,
            tokenType: TokenType.Native,
            tokenMint: PublicKey.default,
            claimLimitPerCooldown: new anchor.BN(0),
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });

    it('should not allow the caller to remove a currency token if they are not the admin', async () => {
      const other = await loadFundedAccount(svm);
      const { fungibleTokenMint } = await loadFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      });
      expect(await sdk.getCurrencyToken(fungibleTokenMint)).not.to.be.null;

      try {
        await sendInstructions(
          svm,
          other,
          await sdk.removeCurrencyToken({
            authority: other.publicKey,
            tokenMint: fungibleTokenMint,
          }),
        );

        expect.fail('Should have failed with Unauthorized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('Unauthorized');
      }
    });
  });

  describe('Add Currency Token', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
    });

    it('should fail if the currency token is already initialized', async () => {
      const { fungibleTokenMint } = await loadFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      });
      expect(await sdk.getCurrencyToken(fungibleTokenMint)).not.to.be.null;

      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenType: TokenType.FungibleSpl,
            tokenMint: fungibleTokenMint,
            claimLimitPerCooldown: new anchor.BN(0),
          }),
        );

        expect.fail('Should have failed with CurrencyTokenAlreadyAccepted error');
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it('should fail when adding SPL token with invalid mint', async () => {
      try {
        const invalidMint = Keypair.generate().publicKey;

        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenType: TokenType.FungibleSpl,
            tokenMint: invalidMint,
            claimLimitPerCooldown: new anchor.BN(0),
          }),
        );

        expect.fail('Should have failed with InvalidTokenType error');
      } catch (error) {
        expect(error.error.errorCode.code).to.equal('InvalidTokenMint');
      }
    });

    it('should fail when token type is Native but token account is not default pubkey', async () => {
      try {
        const nonDefaultPubkey = Keypair.generate().publicKey;

        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenType: TokenType.Native,
            tokenMint: nonDefaultPubkey,
            claimLimitPerCooldown: new anchor.BN(0),
          }),
        );

        expect.fail('Should have failed with InvalidTokenType error');
      } catch (error) {
        expect(error.error.errorCode.code).to.equal('InvalidTokenType');
      }
    });

    it('should fail when token type is SPL but token account is default pubkey', async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.addCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenType: TokenType.FungibleSpl,
            tokenMint: PublicKey.default,
            claimLimitPerCooldown: new anchor.BN(0),
          }),
        );

        expect.fail('Should have failed with InvalidTokenType error');
      } catch (error) {
        expect(error.error.errorCode.code).to.equal('InvalidTokenType');
      }
    });

    it('should add native currency token with default pubkey', async () => {
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.addCurrencyToken({
          authority: globalAdmin.publicKey,
          tokenType: TokenType.Native,
          tokenMint: PublicKey.default,
          claimLimitPerCooldown: new anchor.BN(0),
        }),
      );

      const currencyToken = await sdk.getCurrencyToken(PublicKey.default);
      expect(currencyToken.tokenMint.equals(PublicKey.default)).to.be.true;
      expect(currencyToken.tokenType.toString()).to.equal(
        TokenTypeAnchor[TokenType.Native].toString(),
      );
      expect(currencyToken.isActive).to.equal(true);
    });

    it('should successfully add a valid SPL token mint', async () => {
      // Create a real SPL token mint
      const mint = await createFungibleToken(svm, globalAdmin);

      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.addCurrencyToken({
          authority: globalAdmin.publicKey,
          tokenType: TokenType.FungibleSpl,
          tokenMint: mint,
          claimLimitPerCooldown: new anchor.BN(0),
        }),
      );

      const currencyToken = await sdk.getCurrencyToken(mint);
      expect(currencyToken.tokenMint.equals(mint)).to.be.true;
      expect(currencyToken.tokenType.toString()).to.equal(
        TokenTypeAnchor[TokenType.FungibleSpl].toString(),
      );
      expect(currencyToken.claimLimitPerCooldown.eq(new anchor.BN(0))).to.be.true;
      expect(currencyToken.cumulativeClaimPerCooldown.eq(new anchor.BN(0))).to.be.true;
      expect(currencyToken.claimCooldownPeriodStarted.eq(new anchor.BN(0))).to.be.true;
      expect(currencyToken.isActive).to.equal(true);
    });
  });

  describe('Update Currency Token Limit', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
    });

    it("should fail if the currency token hasn't been added yet", async () => {
      try {
        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.updateCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenMint: PublicKey.default,
            claimLimitPerCooldown: new anchor.BN(100),
          }),
        );

        expect.fail('Should have failed with AccountNotInitialized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('AccountNotInitialized');
      }
    });

    it('should update the limit if it has already been set', async () => {
      const { fungibleTokenMint } = await loadFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      });

      // set the limit to the currency token
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.updateCurrencyToken({
          authority: globalAdmin.publicKey,
          tokenMint: fungibleTokenMint,
          claimLimitPerCooldown: new anchor.BN(200),
        }),
      );

      const newCurrencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
      expect(newCurrencyToken.claimLimitPerCooldown.eq(new anchor.BN(200))).to.be.true;
    });
  });

  describe('Remove Currency Token', () => {
    beforeEach(async () => {
      ({ svm, sdk } = await loadSvmSdk());
      ({ globalAdmin } = await loadGlobalConfigFixture({ svm, sdk }));
    });

    it('should fail if the currency token gas never been added', async () => {
      try {
        expect(await sdk.getCurrencyToken(PublicKey.default).catch(() => null)).to.be.null;

        await sendInstructions(
          svm,
          globalAdmin,
          await sdk.removeCurrencyToken({
            authority: globalAdmin.publicKey,
            tokenMint: PublicKey.default,
          }),
        );

        expect.fail('Should have failed with AccountNotInitialized error');
      } catch (error) {
        expect(error.error.errorCode.code).to.be.eq('AccountNotInitialized');
      }
    });

    it('should set is_active to false for the currency token if the caller is the admin', async () => {
      const { fungibleTokenMint } = await loadFungibleCurrencyTokenFixture({
        svm,
        sdk,
        globalAdmin,
      });

      // Set is_active to false for the currency token
      await sendInstructions(
        svm,
        globalAdmin,
        await sdk.removeCurrencyToken({
          authority: globalAdmin.publicKey,
          tokenMint: fungibleTokenMint,
        }),
      );

      // Check that the currency token is_active is false
      const currencyToken = await sdk.getCurrencyToken(fungibleTokenMint);
      expect(currencyToken.isActive).to.be.false;
    });
  });
});
