use anchor_lang::prelude::*;

use crate::{constants::*, errors::*, state::*};

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

// Project roles instructions
//
// These instructions are only available to the admin of the [Project]
// and are used to manage the roles of the [Project]

/// Grant a role to an account
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct GrantProjectRole<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(
        mut, 
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,
}

/// Revoke a role
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct RevokeProjectRole<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(
        mut, 
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,
}

/// Renounce a role
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct RenounceProjectRole<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    #[account(mut, 
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,
}

//////////////////////////////// HANDLERS ////////////////////////////////

/// Grants a role to an account
///
/// Requirements:
///
/// - The account must not already have the role.
/// - Only admins can call this function.
impl<'info> GrantProjectRole<'info> {
    #[allow(unused_variables)]
    pub fn grant_project_role(&mut self, project_nonce: u64, account: Pubkey, role: ProjectRole) -> Result<()> {
        let project = &mut self.project;

        project.roles_mapping.grant_role(account, role.clone())?;

        emit!(LogProjectRoleGrantedEvent { account, role });

        Ok(())
    }
}

/// Revoke a role
///
/// Requirements:
///
/// - The account must have the role.
/// - Only admins can call this function.
impl<'info> RevokeProjectRole<'info> {
    #[allow(unused_variables)]
    pub fn revoke_project_role(&mut self, project_nonce: u64, account: Pubkey, role: ProjectRole) -> Result<()> {
        require!(account != self.authority.key(), FuulError::CannotRevokeSelf);

        self.project.roles_mapping.revoke_role(account, role.clone())?;

        emit!(LogProjectRoleRevokedEvent { account, role });

        Ok(())
    }
}

/// Renounce a role
///
/// Requirements:
///
/// - Only admins can call this function.
impl<'info> RenounceProjectRole<'info> {
    #[allow(unused_variables)]
    pub fn renounce_project_role(&mut self, project_nonce: u64, role: ProjectRole) -> Result<()> {
        require!(
            self.project.roles_mapping.has_role(self.authority.key(), role.clone()),
            FuulError::Unauthorized
        );
        require!(
            role != ProjectRole::Admin || self.project.roles_mapping.count_roles(ProjectRole::Admin) != 1,
            FuulError::CannotRenounceLastAdmin
        );

        self.project.roles_mapping.revoke_role(self.authority.key(), role.clone())?;

        emit!(LogProjectRoleRenouncedEvent {
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
pub struct LogProjectRoleGrantedEvent {
    pub account: Pubkey,
    pub role: ProjectRole,
}

/// Log the revocation of a role
/// Parameters:
///     - account: The account that was revoked the role
///     - role: The role that was revoked
#[event]
pub struct LogProjectRoleRevokedEvent {
    pub account: Pubkey,
    pub role: ProjectRole,
}

/// Log the renouncement of a role
/// Parameters:
///     - account: The account that was renounced the role
///     - role: The role that was renounced
#[event]
pub struct LogProjectRoleRenouncedEvent {
    pub account: Pubkey,
    pub role: ProjectRole,
}
