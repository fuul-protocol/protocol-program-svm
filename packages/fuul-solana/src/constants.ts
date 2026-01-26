import { PublicKey } from '@solana/web3.js';
import { Network } from './types';

//////////////////////////////// SEEDS ////////////////////////////////

/**
 * Seed tag for the global config PDA.
 * Used to derive the global config program-derived address.
 */
export const GLOBAL_CONFIG_TAG = 'global-config';

/**
 * Seed tag for the currency token PDA.
 * Used to derive the currency token program-derived address.
 */
export const CURRENCY_TOKEN_TAG = 'currency-token';

/**
 * Seed tag for the fuul project PDA (must match on-chain seed).
 * Used to derive project program-derived addresses.
 */
export const PROJECT_TAG = 'project';

/**
 * Seed tag for the project currency budget PDA.
 * Used to derive the project currency budget program-derived address.
 */
export const PROJECT_CURRENCY_BUDGET_TAG = 'project-currency-budget';

/**
 * Seed tag for the project attribution PDA.
 * Used to derive the project attribution program-derived address (nullifier for claim replay protection).
 */
export const PROJECT_ATTRIBUTION_TAG = 'project-attribution';

/**
 * Seed tag for the project user PDA.
 * Used to derive the project user program-derived address (tracks user stats per project).
 */
export const PROJECT_USER_TAG = 'project-user';

//////////////////////////////// PROGRAM IDS ////////////////////////////////

/**
 * Fuul program IDs mapped by network.
 * Maps each network to its corresponding program public key.
 *
 * @remarks keep these updated if new deployments are made
 */
export const FUUL_PROGRAM_ID: Record<Network, PublicKey> = {
  [Network.MAINNET]: new PublicKey('7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg'),
  [Network.DEVNET]: new PublicKey('DiMe3wTNXQcJv8i2chyiwJcjtGcy6zooVsgig9cfihSg'),
  [Network.TESTNET]: new PublicKey('7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg'),
  [Network.LOCALHOST]: new PublicKey('7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg'),
  [Network.FOGO_TESTNET]: new PublicKey('7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg'),
  [Network.FOGO_MAINNET]: new PublicKey('7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg'),
};
