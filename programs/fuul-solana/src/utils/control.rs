use anchor_lang::prelude::*;

use crate::{errors::*, state::*};

/// access control modifier
/// Checks if the authority has the global role
/// Params:
///     - global_config: &Account<GlobalConfig>
///     - authority: &AccountInfo
///     - role: GlobalRole
/// Returns an error if the authority does not have the global role
pub fn has_global_role(
    global_config: &Account<GlobalConfig>,
    authority: &AccountInfo,
    role: GlobalRole,
) -> Result<()> {
    require!(global_config.roles_mapping.has_role(authority.key(), role), FuulError::Unauthorized);
    Ok(())
}

/// Checks if the authority has the project role
/// Params:
///     - project: &Account<Project>
///     - authority: &AccountInfo
///     - role: ProjectRole
/// Returns an error if the authority does not have the project role
pub fn has_project_role(
    project: &Account<Project>,
    authority: &AccountInfo,
    role: ProjectRole,
) -> Result<()> {
    require!(project.roles_mapping.has_role(authority.key(), role), FuulError::Unauthorized);
    Ok(())
}

/// Checks if the program is not paused
/// Params:
///     - global_config: &Account<GlobalConfig>
/// Returns an error if the program is paused
pub fn is_not_paused(global_config: &Account<GlobalConfig>) -> Result<()> {
    require!(!global_config.paused, FuulError::ProgramPaused);
    Ok(())
}
