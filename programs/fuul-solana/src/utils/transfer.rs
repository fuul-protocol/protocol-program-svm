use crate::errors::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_error::ProgramError;
use anchor_spl::token::{self, Transfer};

/// Transfers native tokens from one account to another
/// 
/// Parameters:
/// - `from`: The account to transfer from
/// - `to`: The account to transfer to
/// - `amount`: The amount of native tokens to transfer
/// - `signer`: The signer seeds to use for the transfer
/// 
/// Returns:
/// - Ok() if the transfer was successful
/// - Ok() if amounts is 0
/// - Ok() if from and to are the same (no transfer needed)
/// - Err() otherwise   
pub fn transfer_native<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    signer: Option<&[&[&[u8]]]>,
) -> Result<()> {
    if amount == 0 || from.key() == to.key() {
        return Ok(());
    }

    // check if from has enough funds
    require!(from.lamports() >= amount, FuulError::InsufficientFunds);

    // Check if we're transferring from an account with data (PDA)
    if !from.data_is_empty() {
        // Only allow manual manipulation of accounts owned by this program
        // This prevents draining funds from accounts owned by other programs
        require!(from.owner == &crate::ID, FuulError::Unauthorized);

        // For PDAs with data, we must manually adjust lamports
        // This is the only way to transfer SOL from a PDA that owns data
        **from.try_borrow_mut_lamports()? =
            from.lamports().checked_sub(amount).ok_or(ProgramError::InsufficientFunds)?;

        **to.try_borrow_mut_lamports()? =
            to.lamports().checked_add(amount).ok_or(ProgramError::InvalidArgument)?;
    } else {
        // For regular accounts without data, use system_instruction::transfer
        let transfer_ix = system_instruction::transfer(&from.key(), &to.key(), amount);

        if let Some(signer_seeds) = signer {
            anchor_lang::solana_program::program::invoke_signed(
                &transfer_ix,
                &[from.to_account_info(), to.to_account_info()],
                signer_seeds,
            )?;
        } else {
            anchor_lang::solana_program::program::invoke(
                &transfer_ix,
                &[from.to_account_info(), to.to_account_info()],
            )?;
        }
    }

    Ok(())
}

/// Transfers SPL tokens from one account to another
/// 
/// Parameters:
/// - `token_program`: The token program to use for the transfer
/// - `authority`: The authority to use for the transfer
/// - `from`: The account to transfer from
/// - `to`: The account to transfer to
/// - `amount`: The amount of SPL tokens to transfer
/// - `signer`: The signer seeds to use for the transfer
/// 
/// Returns:
/// - Ok() if the transfer was successful
/// - Ok() if amounts is 0
/// - Ok() if from and to are the same (no transfer needed)
/// - Err() otherwise   
pub fn transfer_spl<'info>(
    token_program: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
    signer: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // quick return if amount is 0 or from and to are the same
    if amount == 0 || from.key() == to.key() {
        return Ok(());
    }

    // validate token program
    require_keys_eq!(token_program.key(), anchor_spl::token::ID);

    // transfer the tokens
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority,
    };
    let cpi_ctx = if let Some(signer) = signer {
        CpiContext::new_with_signer(token_program, cpi_accounts, signer)
    } else {
        CpiContext::new(token_program, cpi_accounts)
    };

    token::transfer(cpi_ctx, amount)?;

    Ok(())
}
