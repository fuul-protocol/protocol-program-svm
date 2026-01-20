use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, state::*};

#[account]
#[derive(InitSpace)]
pub struct Project {
    /// initialized flag
    pub is_initialized: bool,

    /// Nonce for the project
    pub nonce: u64,

    /// Attributions count
    pub attributions_count: u64,

    /// Metadata URI
    #[max_len(MAX_METADATA_URI_LENGTH)]
    pub metadata_uri: String,

    /// Fee management, each project can have overwrites over the global config fees
    pub fee_management: ProjectFeeManagement,

    /// Roles mapping
    pub roles_mapping: ProjectRolesMapping,
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace, Default)]
pub struct ProjectRolesMapping {
    #[max_len(MAX_ROLES_MAPPING_SIZE)]
    pub roles: Vec<ProjectRoleEntry>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct ProjectRoleEntry {
    pub account: Pubkey,
    pub role: ProjectRole,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace, PartialEq)]
pub enum ProjectRole {
    Admin,
}

#[account]
#[derive(InitSpace)]
pub struct ProjectCurrencyBudget {
    /// Project currency budget
    pub budget: u64,

    /// Project currency token
    pub token_mint: Pubkey,

    /// Project currency token account
    pub token_account: Option<Pubkey>,
}

/// Holds information about the different fees in the protocol
#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Debug)]
pub struct ProjectFeeManagement {
    /// Native claim fee in lamports. User should pay for this.
    pub user_native_claim_fee: Option<u64>,

    /// Project claim fee in basis points. Project will pay for this.
    pub project_claim_fee: Option<u16>,

    /// Remove fee in basis points applied when unclaimed funds are removed by project admin.
    pub remove_fee: Option<u16>,
}

impl Project {
    /// Returns the remove fee for this project.
    /// If the project has a custom value set, it returns that.
    /// Otherwise, it returns the global default from the provided GlobalConfig.
    pub fn get_remove_fee(&self, global_config: &GlobalConfig) -> u16 {
        self.fee_management.remove_fee.unwrap_or(global_config.fee_management.remove_fee)
    }

    /// Returns the project claim fee for this project. Project will pay for this.
    /// If the project has a custom value set, it returns that.
    /// Otherwise, it returns the global default from the provided GlobalConfig.
    pub fn get_project_claim_fee(&self, global_config: &GlobalConfig) -> u16 {
        self.fee_management.project_claim_fee.unwrap_or(global_config.fee_management.project_claim_fee)
    }
    

    /// Returns the native claim fee for this project. User should pay for this.
    /// If the project has a custom value set, it returns that.
    /// Otherwise, it returns the global default from the provided GlobalConfig.
    pub fn get_user_native_claim_fee(&self, global_config: &GlobalConfig) -> u64 {
        self.fee_management.user_native_claim_fee.unwrap_or(global_config.fee_management.user_native_claim_fee)
    }
}


impl ProjectRolesMapping {
    /// Returns the number of roles of a given type.
    pub fn count_roles(&self, role: ProjectRole) -> usize {
        self.roles.iter().filter(|r| r.role == role).count()
    }

    /// Grants a role to an account.
    pub fn grant_role(&mut self, account: Pubkey, role: ProjectRole) -> Result<()> {
        require!(self.roles.len() < MAX_ROLES_MAPPING_SIZE, FuulError::MaxRolesReached);
        require!(!self.has_role(account, role.clone()), FuulError::RoleAlreadyExists);

        self.roles.push(ProjectRoleEntry { account, role });
        Ok(())
    }

    /// Revokes a role from an account.
    pub fn revoke_role(&mut self, account: Pubkey, role: ProjectRole) -> Result<()> {
        require!(self.has_role(account, role.clone()), FuulError::RoleDoesNotExist);

        self.roles.retain(|r| r.account != account || r.role != role);
        
        Ok(())
    }

    /// Checks if an account has a given role.
    pub fn has_role(&self, account: Pubkey, role: ProjectRole) -> bool {
        self.roles.iter().any(|r| r.account == account && r.role == role)
    }
}