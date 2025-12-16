use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use crate::{instructions::*, state::*, utils::*};

declare_id!("7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg");

#[program]
pub mod fuul_solana {
    use super::*;

    //////////////////////////////// ADMIN FUNCTIONS ////////////////////////////////

    /// Create global config
    /// This is the first account that is created when the program is initialized.
    pub fn create_global_config(
        ctx: Context<CreateGlobalConfig>,
        fee_collector: Pubkey,
    ) -> Result<()> {
        ctx.accounts.create_global_config(fee_collector)
    }

    /// Update the global config
    ///
    /// Requirements:
    ///
    /// - `claim_cool_down` must be different from the current one.
    /// - `required_signers_for_claim` must be different from the current one.
    /// - Only admins can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn update_global_config(
        ctx: Context<UpdateGlobalConfig>,
        claim_cool_down: Option<u64>,
        required_signers_for_claim: Option<u8>,
    ) -> Result<()> {
        ctx.accounts.update_global_config(claim_cool_down, required_signers_for_claim)
    }

    /// Update global config fee management fields at once.
    ///
    /// Requirements:
    ///
    /// - Any supplied field must be different from the current value.
    /// - Only admins can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn update_global_config_fees(
        ctx: Context<UpdateGlobalConfigFees>,
        fee_collector: Option<Pubkey>,
        user_native_claim_fee: Option<u64>,
        project_claim_fee: Option<u16>,
        remove_fee: Option<u16>,
    ) -> Result<()> {
        ctx.accounts.update_global_config_fees(
            fee_collector,
            user_native_claim_fee,
            project_claim_fee,
            remove_fee,
        )
    }

    /// Add a wallet to the no claim fee whitelist
    /// Parameters:
    /// - account: The wallet to add to the no claim fee whitelist
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn add_no_claim_fee_whitelist(
        ctx: Context<AddNoClaimFeeWhitelist>,
        account: Pubkey,
    ) -> Result<()> {
        ctx.accounts.add_no_claim_fee_whitelist(account)
    }

    /// Remove a wallet from the no claim fee whitelist
    /// Parameters:
    /// - account: The wallet to remove from the no claim fee whitelist
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn remove_no_claim_fee_whitelist(
        ctx: Context<RemoveNoClaimFeeWhitelist>,
        account: Pubkey,
    ) -> Result<()> {
        ctx.accounts.remove_no_claim_fee_whitelist(account)
    }

    //////////////////////////////// PAUSE STATE FUNCTIONS ////////////////////////////////

    /// Pause the program
    /// Sets the paused state of the global config to true.
    /// Only pausers can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Pauser))]
    pub fn pause_program(ctx: Context<PauseProgram>) -> Result<()> {
        ctx.accounts.pause_program()
    }

    /// Unpause the program
    /// Sets the paused state of the global config to false.
    /// Only unpausers can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Unpauser))]
    pub fn unpause_program(ctx: Context<UnpauseProgram>) -> Result<()> {
        ctx.accounts.unpause_program()
    }

    //////////////////////////////// GLOBAL ROLE FUNCTIONS ////////////////////////////////

    /// Grant a role to an account
    /// Parameters:
    /// - account: The account to grant the role to
    /// - role: The role to grant
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn grant_global_role(
        ctx: Context<GrantGlobalRole>,
        account: Pubkey,
        role: GlobalRole,
    ) -> Result<()> {
        ctx.accounts.grant_global_role(account, role)
    }

    /// Revoke a role from an account
    /// Parameters:
    /// - account: The account to revoke the role from
    /// - role: The role to revoke
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn revoke_global_role(
        ctx: Context<RevokeGlobalRole>,
        account: Pubkey,
        role: GlobalRole,
    ) -> Result<()> {
        ctx.accounts.revoke_global_role(account, role)
    }

    /// Renounce a role
    /// Parameters:
    /// - role: The role to renounce
    pub fn renounce_global_role(ctx: Context<RenounceGlobalRole>, role: GlobalRole) -> Result<()> {
        ctx.accounts.renounce_global_role(role)
    }

    //////////////////////////////// CURRENCY TOKEN FUNCTIONS ////////////////////////////////

    /// Add a new currency token to the global config
    ///
    /// Requirements:
    ///
    /// - Only admins can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn add_currency_token(
        ctx: Context<AddCurrencyToken>,
        token_type: TokenType,
        claim_limit_per_cooldown: u64,
    ) -> Result<()> {
        ctx.accounts.add_currency_token(token_type, claim_limit_per_cooldown)
    }

    /// Update the limit of a currency token
    ///
    /// Requirements:
    ///
    /// - Only admins can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn update_currency_token_limit(
        ctx: Context<UpdateCurrencyToken>,
        claim_limit_per_cooldown: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<()> {
        ctx.accounts.update_currency_token(claim_limit_per_cooldown, is_active)
    }

    /// Remove a currency token from the global config
    ///
    /// Requirements:
    ///
    /// - Only admins can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn remove_currency_token(ctx: Context<RemoveCurrencyToken>) -> Result<()> {
        ctx.accounts.remove_currency_token()
    }

    //////////////////////////////// PROJECT FUNCTIONS ////////////////////////////////

    /// Creates a new Project
    ///
    /// Requirements:
    ///
    /// - `project_admin`: The admin of the project
    pub fn create_project(
        ctx: Context<CreateProject>,
        admin: Pubkey,
        metadata_uri: String,
    ) -> Result<()> {
        ctx.accounts.create_project(admin, metadata_uri)
    }

    /// Update the project config
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - `metadata_uri`: The new metadata URI
    #[access_control(has_project_role(&ctx.accounts.project, &ctx.accounts.authority, ProjectRole::Admin))]
    pub fn update_project_config(
        ctx: Context<UpdateProjectConfig>,
        project_nonce: u64,
        metadata_uri: String,
    ) -> Result<()> {
        ctx.accounts.update_project_config(project_nonce, metadata_uri)
    }

    /// Update the project fees
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - `user_native_claim_fee`: The user native claim fee to update
    /// - `project_claim_fee`: The project claim fee to update
    /// - `remove_fee`: The remove fee to update
    /// - Only global config authorities can call this function.
    #[access_control(has_global_role(&ctx.accounts.global_config, &ctx.accounts.authority, GlobalRole::Admin))]
    pub fn update_project_fees(
        ctx: Context<UpdateProjectFees>,
        project_nonce: u64,
        user_native_claim_fee: Option<u64>,
        project_claim_fee: Option<u16>,
        remove_fee: Option<u16>,
    ) -> Result<()> {
        ctx.accounts.update_project_fees(
            project_nonce,
            user_native_claim_fee,
            project_claim_fee,
            remove_fee,
        )
    }

    //////////////////////////////// PROJECT ROLE FUNCTIONS ////////////////////////////////

    /// Grant a role to an account
    /// Parameters:
    /// - account: The account to grant the role to
    /// - role: The role to grant
    #[access_control(has_project_role(&ctx.accounts.project, &ctx.accounts.authority, ProjectRole::Admin))]
    pub fn grant_project_role(
        ctx: Context<GrantProjectRole>,
        project_nonce: u64,
        account: Pubkey,
        role: ProjectRole,
    ) -> Result<()> {
        ctx.accounts.grant_project_role(project_nonce, account, role)
    }

    /// Revoke a role from an account
    /// Parameters:
    /// - account: The account to revoke the role from
    /// - role: The role to revoke
    #[access_control(has_project_role(&ctx.accounts.project, &ctx.accounts.authority, ProjectRole::Admin))]
    pub fn revoke_project_role(
        ctx: Context<RevokeProjectRole>,
        project_nonce: u64,
        account: Pubkey,
        role: ProjectRole,
    ) -> Result<()> {
        ctx.accounts.revoke_project_role(project_nonce, account, role)
    }

    /// Renounce a role
    /// Parameters:
    /// - `project_nonce`: The nonce of the project
    /// - `role`: The role to renounce
    pub fn renounce_project_role(
        ctx: Context<RenounceProjectRole>,
        project_nonce: u64,
        role: ProjectRole,
    ) -> Result<()> {
        ctx.accounts.renounce_project_role(project_nonce, role)
    }

    //////////////////////////////// PROJECT BUDGET FUNCTIONS ////////////////////////////////

    /// Deposit a currency token into the project (Only admin can deposit)
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - `amount`: The amount of the currency token to deposit
    pub fn deposit_fungible_token(
        ctx: Context<DepositFungibleToken>,
        project_nonce: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.deposit_fungible_token(project_nonce, amount)
    }

    /// Deposit a single NFT into a project
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - The NFT must be owned by the authority
    /// - The project must have a token account for the NFT mint
    pub fn deposit_non_fungible_token(
        ctx: Context<DepositNonFungibleToken>,
        project_nonce: u64,
    ) -> Result<()> {
        ctx.accounts.deposit_non_fungible_token(project_nonce)
    }

    /// Remove a single NFT from the project (Only admin can remove)
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - The project must have the NFT
    #[access_control(has_project_role(&ctx.accounts.project, &ctx.accounts.authority, ProjectRole::Admin))]
    pub fn remove_non_fungible_token(
        ctx: Context<RemoveNonFungibleToken>,
        project_nonce: u64,
    ) -> Result<()> {
        ctx.accounts.remove_non_fungible_token(project_nonce)
    }

    /// Remove a currency token from the project (Only admin can remove)
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - `amount`: The amount of the currency token to remove
    #[access_control(has_project_role(&ctx.accounts.project, &ctx.accounts.authority, ProjectRole::Admin))]
    pub fn remove_fungible_token(
        ctx: Context<RemoveFungibleToken>,
        project_nonce: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.remove_fungible_token(project_nonce, amount)
    }

    /// Claim a currency token from the project budget
    ///
    /// Requirements:
    ///
    /// - `project_nonce`: The nonce of the project
    /// - `proof`: The proof of the claim (keccak hash of proof_without_project + project pubkey)
    /// - `proof_without_project`: The proof without project pubkey (used to verify proof)
    #[access_control(is_not_paused(&ctx.accounts.global_config))]
    pub fn claim(
        ctx: Context<Claim>,
        project_nonce: u64,
        proof: [u8; 32],
        proof_without_project: [u8; 32],
    ) -> Result<()> {
        ctx.accounts.claim(project_nonce, proof, proof_without_project)
    }
}
