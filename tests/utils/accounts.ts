import { AccountClient, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

/**
 * Check if a Solana account exists for a given Anchor AccountClient.
 * @param account - The typed AccountClient to fetch from.
 * @param pubkey - The public key of the account to check.
 * @returns true if the account exists and can be deserialized, false otherwise.
 */
export async function accountExists<T extends Idl>(
  account: AccountClient<T>,
  pubkey: PublicKey,
): Promise<boolean> {
  try {
    await account.fetch(pubkey);
    return true;
  } catch (err: any) {
    // Only swallow the "account does not exist" error
    if (typeof err.message === 'string' && err.message.includes('Could not find')) {
      return false;
    }
    throw err; // rethrow other unexpected errors
  }
}
