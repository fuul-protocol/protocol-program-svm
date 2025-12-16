use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::*;

/// Global config
/// This is the first account that is created when the program is initialized.
/// It contains the configuration for the protocol.

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    /// is_initialized flag
    pub is_initialized: bool,

    /// Paused state
    pub paused: bool,

    /// Nonce for projects
    pub project_nonce: u64,
    
    /// Amount of time that must elapse after {claimCooldownPeriodStarted} for the cumulative amount to be restarted
    pub claim_cool_down: u64,

    /// Number of required signers for a claim
    pub required_signers_for_claim: u8,

    /// Fee management
    pub fee_management: FeeManagement,

    /// Roles mapping
    pub roles_mapping: GlobalRolesMapping,
}

/// Holds information about the different fees in the protocol
#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Debug)]
pub struct FeeManagement {
    /// Address that will collect protocol fees
    pub fee_collector: Pubkey,

    /// Array of accounts that are exempt from paying claim fees
    #[max_len(MAX_NO_CLAIM_FEE_WHITELIST_SIZE)]
    pub no_claim_fee_whitelist: Vec<Pubkey>,

    /// Fixed fee in native tokens paid by users per claim
    pub user_native_claim_fee: u64,

    /// Fee paid by the project upon user claim. In basis points.
    pub project_claim_fee: u16,

    /// Rescue fee applied when unclaimed funds are rescued by project admin. In basis points.
    pub remove_fee: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace, Default)]
pub struct GlobalRolesMapping {
    #[max_len(MAX_ROLES_MAPPING_SIZE)]
    pub roles: Vec<GlobalRoleEntry>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct GlobalRoleEntry {
    pub account: Pubkey,
    pub role: GlobalRole,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace, PartialEq)]
pub enum GlobalRole {
    Admin,
    Pauser,
    Unpauser,
    Signer,
}

impl GlobalRolesMapping {
    /// Returns the number of roles of a given type.
    pub fn count_roles(&self, role: GlobalRole) -> usize {
        self.roles.iter().filter(|r| r.role == role).count()
    }

    /// Grants a role to an account.
    pub fn grant_role(&mut self, account: Pubkey, role: GlobalRole) -> Result<()> {
        require!(self.roles.len() < MAX_ROLES_MAPPING_SIZE, FuulError::MaxRolesReached);
        require!(!self.has_role(account, role.clone()), FuulError::RoleAlreadyExists);

        self.roles.push(GlobalRoleEntry { account, role });
        Ok(())
    }

    /// Revokes a role from an account.
    pub fn revoke_role(&mut self, account: Pubkey, role: GlobalRole) -> Result<()> {
        self.roles.retain(|r| r.account != account || r.role != role);
        Ok(())
    }

    /// Checks if an account has a given role.
    pub fn has_role(&self, account: Pubkey, role: GlobalRole) -> bool {
        self.roles.iter().any(|r| r.account == account && r.role == role)
    }
}
