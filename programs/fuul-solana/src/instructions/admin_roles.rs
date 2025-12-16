use anchor_lang::prelude::*;

use crate::{constants::*, errors::*, state::*};

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

// Admin roles instructions
//
// These instructions are only available to the admin of the [Global Config]
// and are used to manage the roles of the [Global Config]

/// Grant a global role to an account
#[derive(Accounts)]
pub struct GrantGlobalRole<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Revoke a role
#[derive(Accounts)]
pub struct RevokeGlobalRole<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

/// Renounce a role
#[derive(Accounts)]
pub struct RenounceGlobalRole<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,
}

//////////////////////////////// HANDLERS ////////////////////////////////

/// Grants a role to an account
///
/// Requirements:
///
/// - The account must not already have the role.
/// - Only admins can call this function.
impl<'info> GrantGlobalRole<'info> {
    pub fn grant_global_role(&mut self, account: Pubkey, role: GlobalRole) -> Result<()> {
        let global_config = &mut self.global_config;

        global_config.roles_mapping.grant_role(account, role.clone())?;

        emit!(LogGlobalRoleGrantedEvent { account, role });

        Ok(())
    }
}

/// Revoke a role
///
/// Requirements:
///
/// - The account must have the role.
/// - Only admins can call this function.
impl<'info> RevokeGlobalRole<'info> {
    pub fn revoke_global_role(&mut self, account: Pubkey, role: GlobalRole) -> Result<()> {
        let global_config = &mut self.global_config;

        // Verify the account is not the authority
        require!(
            account != self.authority.key(),
            FuulError::CannotRevokeSelf
        );

        global_config.roles_mapping.revoke_role(account, role.clone())?;

        emit!(LogGlobalRoleRevokedEvent { account, role });

        Ok(())
    }
}

/// Renounce a role
///
/// Requirements:
///
/// - The authority must have the role they are trying to renounce.
/// - Cannot renounce the last admin role.
impl<'info> RenounceGlobalRole<'info> {
    pub fn renounce_global_role(&mut self, role: GlobalRole) -> Result<()> {
        let global_config = &mut self.global_config;

        // Verify the role is not the last admin
        require!(
            role != GlobalRole::Admin || global_config.roles_mapping.count_roles(GlobalRole::Admin) != 1,
            FuulError::CannotRenounceLastAdmin
        );

        global_config.roles_mapping.revoke_role(self.authority.key(), role.clone())?;

        emit!(LogGlobalRoleRenouncedEvent {
            account: self.authority.key(),
            role
        });

        Ok(())
    }
}

//////////////////////////////// EVENTS ////////////////////////////////

/// Log the grant of a role
/// Parameters:
///     - account: The account that was granted the role
///     - role: The role that was granted
#[event]
pub struct LogGlobalRoleGrantedEvent {
    pub account: Pubkey,
    pub role: GlobalRole,
}

/// Log the revocation of a role
/// Parameters:
///     - account: The account that was revoked the role
///     - role: The role that was revoked
#[event]
pub struct LogGlobalRoleRevokedEvent {
    pub account: Pubkey,
    pub role: GlobalRole,
}

/// Log the renouncement of a role
/// Parameters:
///     - account: The account that was renounced the role
///     - role: The role that was renounced
#[event]
pub struct LogGlobalRoleRenouncedEvent {
    pub account: Pubkey,
    pub role: GlobalRole,
}
