import * as anchor from '@coral-xyz/anchor';

// test parameters

export const INITIAL_CLAIM_COOLDOWN = new anchor.BN(1 * 24 * 60 * 60); // 1 day
export const INITIAL_USER_NATIVE_CLAIM_FEE = new anchor.BN(0);
export const INITIAL_PROJECT_CLAIM_FEE = 0;
export const INITIAL_REMOVE_FEE = 0;
export const INITIAL_REQUIRED_SIGNERS_FOR_CLAIM = 1;
