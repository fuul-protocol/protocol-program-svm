

use anchor_lang::prelude::*;

/// Project user account to track user stats
#[account]
#[derive(InitSpace)]
pub struct ProjectUser {
    /// User the user is associated with
    pub authority: Pubkey,

    /// Project the user is associated with
    pub project: Pubkey,

    /// Total claims made by the user
    pub total_claims: u64,

    /// Total native tokens claimed by the user
    pub total_native_claimed: u64,
}
