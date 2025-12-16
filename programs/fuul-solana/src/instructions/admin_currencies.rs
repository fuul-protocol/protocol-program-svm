
use anchor_lang::prelude::*;
use anchor_spl::token::spl_token;
use spl_token::solana_program::program_pack::Pack;

use crate::{constants::*, errors::*, state::*};

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

// Admin instructions for the token management
//
// These instructions are only available to the admin of the [Global Config]
// and are used to update the [Global Config]


/// Adds a new currency token to the [Global Config].
#[derive(Accounts)]
pub struct AddCurrencyToken<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init_if_needed, 
        payer = authority, 
        space = CurrencyToken::DISCRIMINATOR.len() + CurrencyToken::INIT_SPACE, 
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()], 
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,

    /// CHECK: This is the mint address used only for PDA derivation and metadata lookup.
    /// It can also be the native token account and so we check token validity in the handler.
    pub token_mint: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Update the limit of a currency token in the [Global Config].
#[derive(Accounts)]
pub struct UpdateCurrencyToken<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut, 
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()], 
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,

    /// CHECK: This is the mint address used only for PDA derivation and metadata lookup.
    pub token_mint: UncheckedAccount<'info>,
}

/// Remove a currency token from the [Global Config].
#[derive(Accounts)]
pub struct RemoveCurrencyToken<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut, 
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()], 
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,

    /// CHECK: This is the mint address used only for PDA derivation and metadata lookup.
    pub token_mint: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

//////////////////////////////// HANDLERS ////////////////////////////////


/// Adds a new currency token to the [Global Config].
/// - Params:
///     - token_type: The type of the new currency token
///     - claim_limit_per_cooldown: The limit of the new currency token
impl<'info> AddCurrencyToken<'info> {
    pub fn add_currency_token(&mut self, token_type: TokenType, claim_limit_per_cooldown: u64) -> Result<()> {
        let is_native = self.token_mint.key() == Pubkey::default();
        let currency_token = &mut self.currency_token;

        // Verify the currency token is not already initialized
        require!(
            !currency_token.is_initialized,
            FuulError::AlreadyInitialized
        );

        if token_type == TokenType::Native && !is_native || token_type != TokenType::Native && is_native {
            return Err(FuulError::InvalidTokenType.into());
        } else if token_type != TokenType::Native {
            // Try to verify it's a valid Mint
            spl_token::state::Mint::unpack(&self.token_mint.try_borrow_data()?)
                .map_err(|_| FuulError::InvalidTokenMint)?;
        }

        currency_token.is_initialized = true;
        currency_token.token_mint = self.token_mint.key();
        currency_token.token_type = token_type.clone();
        currency_token.claim_limit_per_cooldown = claim_limit_per_cooldown;
        currency_token.cumulative_claim_per_cooldown = 0;
        currency_token.claim_cooldown_period_started = 0;
        currency_token.is_active = true;

        emit!(LogCurrencyTokenAddedEvent {
            token_type,
            token_mint: self.token_mint.key(),
            claim_limit_per_cooldown,
        });

        Ok(())
    }
}

/// Update a currency token in the [Global Config].
/// - Params:
///     - currency_token: The currency token to update
///     - is_active: The new active status of the currency token
impl<'info> UpdateCurrencyToken<'info> {
    pub fn update_currency_token(&mut self, claim_limit_per_cooldown: Option<u64>, is_active: Option<bool>) -> Result<()> {
        let currency_token = &mut self.currency_token;

        // Verify that at least one field is provided to update
        require!(
            claim_limit_per_cooldown.is_some() || is_active.is_some(),
            FuulError::NothingToUpdate
        );

        if let Some(claim_limit_per_cooldown) = claim_limit_per_cooldown {
            if claim_limit_per_cooldown == 0 {
                return Err(FuulError::ZeroValueNotAllowed.into());
            }

            if currency_token.claim_limit_per_cooldown > 0 {
                // update the limit if it's already set
                if currency_token.claim_limit_per_cooldown == claim_limit_per_cooldown {
                    return Err(FuulError::NoNewChanges.into());
                } else if claim_limit_per_cooldown < currency_token.cumulative_claim_per_cooldown {
                    return Err(FuulError::LimitBelowCumulative.into());
                }
    
                currency_token.claim_limit_per_cooldown = claim_limit_per_cooldown;
            } else {
                // set it for the first time so we reset the cumulative claim and the cooldown period
                currency_token.claim_limit_per_cooldown = claim_limit_per_cooldown;
                currency_token.cumulative_claim_per_cooldown = 0;
                currency_token.claim_cooldown_period_started = Clock::get()?.unix_timestamp;
            }
        }


        if let Some(is_active) = is_active {
            if currency_token.is_active == is_active {
                return Err(FuulError::NoNewChanges.into());
            }

            currency_token.is_active = is_active;
        }
    

        emit!(LogCurrencyTokenUpdatedEvent {
            token_mint: self.token_mint.key(),
            claim_limit_per_cooldown,
            is_active,
        });

        Ok(())
    }
}

/// Remove a currency token from the [Global Config].
impl<'info> RemoveCurrencyToken<'info> {
    pub fn remove_currency_token(&mut self) -> Result<()> {
        self.currency_token.is_active = false;

        emit!(LogCurrencyTokenRemovedEvent {
            token_mint: self.token_mint.key(),
        });

        Ok(())
    }
}


//////////////////////////////// EVENTS ////////////////////////////////

/// Log the addition of a new currency token
/// Parameters:
///     - token_mint: The mint of the new currency token
///     - token_type: The type of the new currency token
///     - claim_limit_per_cooldown: The limit of the new currency token
#[event]
pub struct LogCurrencyTokenAddedEvent {
    pub token_mint: Pubkey,
    pub token_type: TokenType,
    pub claim_limit_per_cooldown: u64,
}

/// Log the update of the currency token limit
/// Parameters:
///     - token_mint: The mint of the currency token
///     - claim_limit_per_cooldown: The new limit of the currency token
///     - is_active: The new active status of the currency token
#[event]
pub struct LogCurrencyTokenUpdatedEvent {
    pub token_mint: Pubkey,
    pub claim_limit_per_cooldown: Option<u64>,
    pub is_active: Option<bool>,
}

/// Log the removal of a currency token
/// Parameters:
///     - token_mint: The mint of the currency token
#[event]
pub struct LogCurrencyTokenRemovedEvent {
    pub token_mint: Pubkey,
}

