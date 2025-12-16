use anchor_lang::prelude::*;

/// Nullifier account to track used nonces and prevent signature replay attacks
#[account]
#[derive(InitSpace)]
pub struct ProjectAttribution {
    /// Nonce of the attribution
    pub nonce: u64,

    /// Token mint of the claim
    pub token_mint: Pubkey,

    /// Amount of the claim
    pub amount: u64,

    /// Recipient of the claim
    pub recipient: Pubkey,

    /// Proof of the claim
    pub proof: [u8; 32],

    /// Timestamp of the claim
    pub timestamp: i64,
}

