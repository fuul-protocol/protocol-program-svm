use crate::{constants::*, errors::*, state::*};
use anchor_lang::prelude::*;

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

#[derive(Accounts)]
pub struct CreateProject<'info> {
    // Payer account (owner of the program)
    #[account(signer, mut)]
    pub authority: Signer<'info>,

    // The global config
    #[account(mut, address = GLOBAL_CONFIG_ADDRESS)]
    pub global_config: Account<'info, GlobalConfig>,

    // The project to be created.
    #[account(
        init,
        payer = authority,
        seeds = [PROJECT_TAG.as_bytes(), &global_config.project_nonce.to_le_bytes()],
        bump,
        space = Project::DISCRIMINATOR.len() + Project::INIT_SPACE,
    )]
    pub project: Account<'info, Project>,

    pub system_program: Program<'info, System>,
}

//////////////////////////////// HANDLERS ////////////////////////////////

impl<'info> CreateProject<'info> {
    pub fn create_project(&mut self, admin: Pubkey, metadata_uri: String) -> Result<()> {
        require!(admin != Pubkey::default(), FuulError::ZeroValueNotAllowed);
        require!(!self.project.is_initialized, FuulError::AlreadyInitialized);

        // Initialize the project
        self.project.is_initialized = true;
        self.project.nonce = self.global_config.project_nonce;
        self.project.metadata_uri = metadata_uri.clone();

        // increment the project nonce
        self.global_config.project_nonce += 1;

        // grant the admin role to the project admin
        self.project.roles_mapping.grant_role(admin, ProjectRole::Admin)?;

        emit!(LogProjectCreatedEvent {
            admin,
            metadata_uri,
            project_nonce: self.project.nonce,
        });

        Ok(())
    }
}

//////////////////////////////// EVENTS ////////////////////////////////

/// Log the creation of the project
/// Parameters:
/// - `admin`: The admin of the project
/// - `project_nonce`: The nonce of the created project
#[event]
pub struct LogProjectCreatedEvent {
    pub admin: Pubkey,
    pub metadata_uri: String,
    pub project_nonce: u64,
}
