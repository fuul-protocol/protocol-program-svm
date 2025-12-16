use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CurrencyToken {
    /// is_initialized flag
    pub is_initialized: bool,

    /// Token mint
    pub token_mint: Pubkey,
    
    /// Token type
    pub token_type: TokenType,
    
    /// Is active
    pub is_active: bool,
    
    /// Claim limit per cooldown
    pub claim_limit_per_cooldown: u64,
    
    /// Cumulative claim per cooldown
    pub cumulative_claim_per_cooldown: u64,

    /// Claim cooldown period started
    pub claim_cooldown_period_started: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace, PartialEq)]
pub enum TokenType {
    Native,
    FungibleSpl,
    NonFungibleSpl,
}