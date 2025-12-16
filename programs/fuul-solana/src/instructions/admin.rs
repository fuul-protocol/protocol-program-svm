use anchor_lang::prelude::*;

use crate::{constants::*, errors::*, state::*};

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

// Admin instructions
//
// These instructions are only available to the admin of the [Global Config]
// and are used to update the [Global Config]

/// Update the global config settings (claim_cool_down and required_signers_for_claim)
#[derive(Accounts)]
pub struct UpdateGlobalConfig<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Update all fees at once
#[derive(Accounts)]
pub struct UpdateGlobalConfigFees<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Add wallet to the no claim fee whitelist
#[derive(Accounts)]
pub struct AddNoClaimFeeWhitelist<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Remove wallet from the no claim fee whitelist
#[derive(Accounts)]
pub struct RemoveNoClaimFeeWhitelist<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Sets the paused state of the [Global Config].
#[derive(Accounts)]
pub struct PauseProgram<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Unpauses the program
#[derive(Accounts)]
pub struct UnpauseProgram<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

//////////////////////////////// HANDLERS ////////////////////////////////

/// Updates the global config
///
/// Requirements:
///
/// - `claim_cool_down` must be different from the current one and a valid value.
/// - `required_signers_for_claim` must be different from the current one and a valid value.
/// - Only admins can call this function.
impl<'info> UpdateGlobalConfig<'info> {
    pub fn update_global_config(
        &mut self,
        claim_cool_down: Option<u64>,
        required_signers_for_claim: Option<u8>,
    ) -> Result<()> {
        let global_config = &mut self.global_config;

        // Verify that at least one field is provided to update
        require!(
            claim_cool_down.is_some() || required_signers_for_claim.is_some(),
            FuulError::NothingToUpdate
        );

        if let Some(claim_cool_down) = claim_cool_down {
            if claim_cool_down == global_config.claim_cool_down {
                return Err(FuulError::NoNewChanges.into());
            }

            if claim_cool_down == 0 {
                return Err(FuulError::ZeroValueNotAllowed.into());
            }

            global_config.claim_cool_down = claim_cool_down;
        }

        if let Some(required_signers_for_claim) = required_signers_for_claim {
            if required_signers_for_claim == global_config.required_signers_for_claim {
                return Err(FuulError::NoNewChanges.into());
            }

            global_config.required_signers_for_claim = required_signers_for_claim;
        }

        emit!(LogGlobalConfigUpdatedEvent {
            claim_cool_down: global_config.claim_cool_down,
            required_signers_for_claim: global_config.required_signers_for_claim,
        });

        Ok(())
    }
}

/// Updates all fees at once allowing for partial updates
/// 
/// Parameters:
///     - fee_collector: The new fee collector
///     - user_native_claim_fee: The new user native claim fee
///     - project_claim_fee: The new project claim fee
///     - remove_fee: The new remove fee
///
/// Requirements:
///
/// - `fee_collector` must be different from the current one (if provided).
/// - `user_native_claim_fee` must be different from the current one (if provided).
/// - `project_claim_fee` must be different from the current one and a valid percentage (if provided).
/// - `remove_fee` must be different from the current one and a valid percentage (if provided).
/// - At least one field must be provided to update.
/// - Only admins can call this function.
impl<'info> UpdateGlobalConfigFees<'info> {
    pub fn update_global_config_fees(
        &mut self,
        fee_collector: Option<Pubkey>,
        user_native_claim_fee: Option<u64>,
        project_claim_fee: Option<u16>,
        remove_fee: Option<u16>,
    ) -> Result<()> {
        let global_config = &mut self.global_config;

        // Verify we have at least one new value to update
        require!(
            fee_collector.is_some()
            || user_native_claim_fee.is_some()
            || project_claim_fee.is_some()
            || remove_fee.is_some(),
            FuulError::NoNewChanges
        );

        // Update the fee collector if provided
        if let Some(fee_collector) = fee_collector {
            if fee_collector == Pubkey::default() {
                return Err(FuulError::ZeroValueNotAllowed.into());
            }

            if fee_collector == global_config.fee_management.fee_collector {
                return Err(FuulError::NoNewChanges.into());
            }

            global_config.fee_management.fee_collector = fee_collector;
        }

        // Update the user native claim fee if provided
        if let Some(user_native_claim_fee) = user_native_claim_fee {
            if user_native_claim_fee == global_config.fee_management.user_native_claim_fee {
                return Err(FuulError::NoNewChanges.into());
            }

            global_config.fee_management.user_native_claim_fee = user_native_claim_fee;
        }

        // Update the project claim fee if provided
        if let Some(project_claim_fee) = project_claim_fee {
            if project_claim_fee == global_config.fee_management.project_claim_fee {
                return Err(FuulError::NoNewChanges.into());
            }

            // Validate the project claim fee is a valid percentage
            if project_claim_fee > BASIS_POINTS {
                return Err(FuulError::InvalidPercentage.into());
            }

            global_config.fee_management.project_claim_fee = project_claim_fee;
        }

        // Update the remove fee if provided
        if let Some(remove_fee) = remove_fee {
            if remove_fee == global_config.fee_management.remove_fee {
                return Err(FuulError::NoNewChanges.into());
            } 
            
            // Validate the remove fee is a valid percentage
            if remove_fee > BASIS_POINTS {
                return Err(FuulError::InvalidPercentage.into());
            }

            global_config.fee_management.remove_fee = remove_fee;
        }

        emit!(LogGlobalConfigFeesUpdatedEvent {
            fee_collector,
            user_native_claim_fee,
            project_claim_fee,
            remove_fee,
        });

        Ok(())
    }
}

/// Add wallet to the no claim fee whitelist
impl<'info> AddNoClaimFeeWhitelist<'info> {
    pub fn add_no_claim_fee_whitelist(&mut self, account: Pubkey) -> Result<()> {
        require!(account != Pubkey::default(), FuulError::ZeroValueNotAllowed);
        require!(
            !self.global_config.fee_management.no_claim_fee_whitelist.contains(&account),
            FuulError::AlreadyInWhitelist
        );
        require!(
            self.global_config.fee_management.no_claim_fee_whitelist.len() < MAX_NO_CLAIM_FEE_WHITELIST_SIZE,
            FuulError::WhitelistFull
        );

        self.global_config.fee_management.no_claim_fee_whitelist.push(account);

        emit!(LogNoClaimFeeWhitelistAddedEvent { account });

        Ok(())
    }
}

/// Remove wallet from the no claim fee whitelist
impl<'info> RemoveNoClaimFeeWhitelist<'info> {
    pub fn remove_no_claim_fee_whitelist(&mut self, account: Pubkey) -> Result<()> {
        require!(
            self.global_config.fee_management.no_claim_fee_whitelist.contains(&account),
            FuulError::NotInWhitelist
        );

        self.global_config.fee_management.no_claim_fee_whitelist.retain(|&x| x != account);

        emit!(LogNoClaimFeeWhitelistRemovedEvent { account });

        Ok(())
    }
}

/// Change the paused state of the [Global Config]
impl<'info> PauseProgram<'info> {
    pub fn pause_program(&mut self) -> Result<()> {
        require!(!self.global_config.paused, FuulError::NoNewChanges);

        self.global_config.paused = true;

        emit!(LogProgramPausedEvent {
            paused_by: self.authority.key(),
        });

        Ok(())
    }
}

/// Unpauses the program
impl<'info> UnpauseProgram<'info> {
    pub fn unpause_program(&mut self) -> Result<()> {
        require!(self.global_config.paused, FuulError::NoNewChanges);

        self.global_config.paused = false;

        emit!(LogProgramUnpausedEvent {
            unpaused_by: self.authority.key(),
        });

        Ok(())
    }
}

//////////////////////////////// EVENTS ////////////////////////////////

/// Log the update of the global config
/// Parameters:
///     - claim_cool_down: The new claim cool down
///     - required_signers_for_claim: The new required signers for claim
#[event]
pub struct LogGlobalConfigUpdatedEvent {
    pub claim_cool_down: u64,
    pub required_signers_for_claim: u8,
}

/// Log the update of all fees with the new values
///
/// Parameters:
///     - fee_collector: The new fee collector
///     - user_native_claim_fee: The new user native claim fee
///     - project_claim_fee: The new project claim fee
///     - remove_fee: The new remove fee
#[event]
pub struct LogGlobalConfigFeesUpdatedEvent {
    pub fee_collector: Option<Pubkey>,
    pub user_native_claim_fee: Option<u64>,
    pub project_claim_fee: Option<u16>,
    pub remove_fee: Option<u16>,
}

/// Log the addition of a wallet to the no claim fee whitelist
/// Parameters:
///     - account: The wallet that was added to the no claim fee whitelist
#[event]
pub struct LogNoClaimFeeWhitelistAddedEvent {
    pub account: Pubkey,
}

/// Log the removal of a wallet from the no claim fee whitelist
/// Parameters:
///     - account: The wallet that was removed from the no claim fee whitelist
#[event]
pub struct LogNoClaimFeeWhitelistRemovedEvent {
    pub account: Pubkey,
}

/// Log the update of the paused state
/// Parameters:
///     - paused_by: The account that paused the program
#[event]
pub struct LogProgramPausedEvent {
    pub paused_by: Pubkey,
}

/// Log the update of the paused state
/// Parameters:
///     - unpaused_by: The account that unpaused the program
#[event]
pub struct LogProgramUnpausedEvent {
    pub unpaused_by: Pubkey,
}
