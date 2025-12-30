use anchor_lang::prelude::*;

use crate::{constants::*, errors::*, state::*};

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

/// Updates the project config
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct UpdateProjectConfig<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The project to update.
    #[account(
        mut,
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,
}

/// Updates the project fees
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct UpdateProjectFees<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The project to update.
    #[account(
        mut,
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    #[account(address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

//////////////////////////////// HANDLERS ////////////////////////////////

impl<'info> UpdateProjectConfig<'info> {
    #[allow(unused_variables)]
    pub fn update_project_config(
        &mut self,
        project_nonce: u64,
        metadata_uri: String,
    ) -> Result<()> {
        require!(
            metadata_uri != self.project.metadata_uri,
            FuulError::NoNewChanges
        );

        self.project.metadata_uri = metadata_uri.clone();

        emit!(LogProjectConfigUpdatedEvent {
            project: self.project.key(),
            metadata_uri: Some(metadata_uri),
        });

        Ok(())
    }
}

/// Updates the project fees
///
/// Requirements:
///
/// - `project_nonce`: The nonce of the project
/// - `fees`: The fees to update
/// - Only global authorities can call this function.
impl<'info> UpdateProjectFees<'info> {
    #[allow(unused_variables, clippy::too_many_arguments)]
    pub fn update_project_fees(
        &mut self,
        project_nonce: u64,
        user_native_claim_fee: Option<u64>,
        project_claim_fee: Option<u16>,
        remove_fee: Option<u16>,
    ) -> Result<()> {
        // Verify we have at least one new value to update
        require!(
            user_native_claim_fee.is_some() || project_claim_fee.is_some() || remove_fee.is_some(),
            FuulError::NoNewChanges
        );

        // Update the user native claim fee if provided
        if let Some(user_native_claim_fee) = user_native_claim_fee {
            if Some(user_native_claim_fee) == self.project.fee_management.user_native_claim_fee
            {
                return Err(FuulError::NoNewChanges.into());
            }

            self.project.fee_management.user_native_claim_fee = Some(user_native_claim_fee);
        }

        // Update the project claim fee if provided
        if let Some(project_claim_fee) = project_claim_fee {
            if Some(project_claim_fee) == self.project.fee_management.project_claim_fee {
                return Err(FuulError::NoNewChanges.into());
            }

            // Validate the project claim fee is a valid percentage
            if project_claim_fee > BASIS_POINTS {
                return Err(FuulError::InvalidPercentage.into());
            }

            self.project.fee_management.project_claim_fee = Some(project_claim_fee);
        }

        // Update the remove fee if provided
        if let Some(remove_fee) = remove_fee {
            if Some(remove_fee) == self.project.fee_management.remove_fee  {
                return Err(FuulError::NoNewChanges.into());
            }

            // Validate the remove fee is a valid percentage
            if remove_fee > BASIS_POINTS {
                return Err(FuulError::InvalidPercentage.into());
            }

            self.project.fee_management.remove_fee = Some(remove_fee);
        }

        emit!(LogProjectFeesUpdatedEvent {
            project: self.project.key(),
            user_native_claim_fee,
            project_claim_fee,
            remove_fee,
        });

        Ok(())
    }
}

//////////////////////////////// EVENTS ////////////////////////////////

/// Log the update of the project config
/// Parameters:
/// - `project`: The project that was updated
/// - `metadata_uri`: The new metadata URI
#[event]
pub struct LogProjectConfigUpdatedEvent {
    pub project: Pubkey,
    pub metadata_uri: Option<String>,
}

/// Log the update of the project fees
/// Parameters:
/// - `project`: The project that was updated
/// - `user_native_claim_fee`: The new user native claim fee
/// - `project_claim_fee`: The new project claim fee
/// - `remove_fee`: The new remove fee
#[event]
pub struct LogProjectFeesUpdatedEvent {
    pub project: Pubkey,
    pub user_native_claim_fee: Option<u64>,
    pub project_claim_fee: Option<u16>,
    pub remove_fee: Option<u16>,
}
