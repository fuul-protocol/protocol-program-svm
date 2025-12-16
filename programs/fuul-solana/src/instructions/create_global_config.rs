use crate::constants::*;
use crate::errors::*;
use crate::state::*;

use anchor_lang::prelude::*;

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

#[derive(Accounts)]
pub struct CreateGlobalConfig<'info> {
    // Payer account (owner of the program)
    #[account(signer, mut)]
    pub authority: Signer<'info>,

    // The [GlobalConfig] to be created.
    #[account(
        init_if_needed,
        address = GLOBAL_CONFIG_ADDRESS,
        seeds = [
            GLOBAL_CONFIG_TAG.as_bytes(),
        ],
        bump,
        payer = authority,
        space = GlobalConfig::DISCRIMINATOR.len() + GlobalConfig::INIT_SPACE,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

//////////////////////////////// HANDLERS ////////////////////////////////

impl<'info> CreateGlobalConfig<'info> {
    pub fn create_global_config(&mut self, initial_fee_collector: Pubkey) -> Result<()> {
        require!(initial_fee_collector != Pubkey::default(), FuulError::ZeroValueNotAllowed);
        require!(!self.global_config.is_initialized, FuulError::AlreadyInitialized);

        // general default values
        self.global_config.is_initialized = true;
        self.global_config.required_signers_for_claim = 1;
        self.global_config.claim_cool_down = 86400; // 1 day

        // default fees
        self.global_config.fee_management.fee_collector = initial_fee_collector;
        self.global_config.fee_management.user_native_claim_fee = 0;
        self.global_config.fee_management.project_claim_fee = 0;
        self.global_config.fee_management.remove_fee = 0;
        self.global_config.fee_management.no_claim_fee_whitelist = vec![];

        // default roles
        self.global_config.roles_mapping.grant_role(self.authority.key(), GlobalRole::Admin)?;
        self.global_config.roles_mapping.grant_role(self.authority.key(), GlobalRole::Pauser)?;
        self.global_config.roles_mapping.grant_role(self.authority.key(), GlobalRole::Unpauser)?;
        self.global_config.roles_mapping.grant_role(self.authority.key(), GlobalRole::Signer)?;

        emit!(LogGlobalConfigCreatedEvent {});

        Ok(())
    }
}

//////////////////////////////// EVENTS ////////////////////////////////

/// Log the creation of the global config
#[event]
pub struct LogGlobalConfigCreatedEvent {}
