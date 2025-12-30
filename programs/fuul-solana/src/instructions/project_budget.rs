use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, state::*, utils::*};
use anchor_spl::{token::{Mint, Token, TokenAccount}};
use borsh::BorshDeserialize;
use anchor_spl::associated_token::AssociatedToken;
use anchor_lang::solana_program::{sysvar::instructions as ix_sysvar, sysvar::SysvarId};

//////////////////////////////// MESSAGES ////////////////////////////////

#[derive(BorshDeserialize)]
pub enum ClaimReason {
    AffiliatePayout,
    EndUserPayout,
}

#[derive(BorshDeserialize)]
pub struct ClaimMessageData {
    pub amount: u64,
    pub project: Pubkey,
    pub recipient: Pubkey,
    pub token_type: TokenType,
    pub token_mint: Pubkey,
    pub proof: [u8; 32],
    pub reason: ClaimReason,
}

#[derive(BorshDeserialize)]
pub struct ClaimMessage {
    pub data: ClaimMessageData,
    pub domain: MessageDomain,
}

//////////////////////////////// INSTRUCTIONS ////////////////////////////////

/// Deposit a fungible token to a project
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct DepositFungibleToken<'info> {
    /// CHECK: This is the token mint to deposit. It's the default public key for native tokens.
    pub token_mint: UncheckedAccount<'info>,

    /// The currency token to deposit.
    #[account(
        mut,
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()],
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,

    /// The authority to deposit from.
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The authority token account to deposit from, only required for SPL tokens.
    #[account(
        mut,
        constraint = authority_ata.owner == authority.key() @FuulError::Unauthorized, 
        constraint = authority_ata.mint == token_mint.key() @FuulError::InvalidTokenMint,
    )]
    pub authority_ata: Option<Account<'info, TokenAccount>>,

    /// The project to deposit to.
    #[account(
        mut,
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    /// The project token account to deposit to.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = project
    )]
    pub project_ata: Option<Account<'info, TokenAccount>>,

    /// The project currency vault keeps track of the deposited balance
    #[account(
        init_if_needed,
        payer = authority,
        space = ProjectCurrencyBudget::DISCRIMINATOR.len() + ProjectCurrencyBudget::INIT_SPACE,
        seeds = [
            PROJECT_CURRENCY_BUDGET_TAG.as_bytes(),
            project.key().as_ref(),
            currency_token.key().as_ref(),
        ],
        bump
    )]
    pub project_currency_budget: Account<'info, ProjectCurrencyBudget>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// Deposit a single NFT into a project
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct DepositNonFungibleToken<'info> {
    /// The authority to deposit from.
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The authority token account to deposit from (the NFT source)
    #[account(
        mut,
        constraint = authority_ata.owner == authority.key() @FuulError::Unauthorized, 
        constraint = authority_ata.mint == token_mint.key() @FuulError::InvalidTokenMint,
        constraint = authority_ata.amount >= 1 @FuulError::InsufficientBalance,
    )]
    pub authority_ata: Account<'info, TokenAccount>,

    /// The project to deposit to.
    #[account(
        mut,
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    /// The project token account to deposit to (the NFT destination)
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = project
    )]
    pub project_ata: Account<'info, TokenAccount>,

    /// The NFT mint being transferred (must have 0 decimals)
    #[account(
        constraint = token_mint.decimals == 0 @FuulError::InvalidTokenType
    )]
    pub token_mint: Account<'info, Mint>,

    /// The currency token to deposit.
    #[account(
        mut,
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()],
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,  

    /// The project currency budget keeps track of the budget balance
    #[account(
        init_if_needed,
        payer = authority,
        space = ProjectCurrencyBudget::DISCRIMINATOR.len() + ProjectCurrencyBudget::INIT_SPACE,
        seeds = [PROJECT_CURRENCY_BUDGET_TAG.as_bytes(), project.key().as_ref(), currency_token.key().as_ref()],
        bump
    )]
    pub project_currency_budget: Account<'info, ProjectCurrencyBudget>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


/// Remove/withdraw a currency token from the project
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct RemoveFungibleToken<'info> {
    #[account(mut, address = GLOBAL_CONFIG_ADDRESS)]
    pub global_config: Account<'info, GlobalConfig>,

    /// CHECK: This is the token mint to withdraw. It's the default public key for native tokens.
    pub token_mint: UncheckedAccount<'info>,

    /// The fee collector account
    /// CHECK: The fee collector account is validated through the global config.
    #[account(
        mut,
        constraint = fee_collector.key() == global_config.fee_management.fee_collector @FuulError::InvalidFeeCollector
    )]
    pub fee_collector: AccountInfo<'info>,

    /// The fee collector account
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = fee_collector
    )]
    pub protocol_fee_collector_ata: Option<Account<'info, TokenAccount>>,

    /// The authority that will receive the fee. Must be admin.
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The authority token account to withdraw to, only required for SPL tokens.
    #[account(mut,
        associated_token::mint = token_mint,
        associated_token::authority = authority
    )]
    pub authority_ata: Option<Account<'info, TokenAccount>>,

    /// The project to withdraw from.
    #[account(
        mut,
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    /// The project currency vault ata to withdraw from, only required for SPL tokens.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = project
    )]
    pub project_ata: Option<Account<'info, TokenAccount>>,

    /// The currency token to withdraw.
    #[account(
        mut,
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()],
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,

    /// The project currency budget keeps track of the budget balance
    #[account(
        mut,
        seeds = [
            PROJECT_CURRENCY_BUDGET_TAG.as_bytes(),
            project.key().as_ref(),
            currency_token.key().as_ref(),
        ],
        bump
    )]
    pub project_currency_budget: Account<'info, ProjectCurrencyBudget>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// Remove/withdraw a single NFT from the project
#[derive(Accounts)]
#[instruction(project_nonce: u64)]
pub struct RemoveNonFungibleToken<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The authority token account to withdraw to (the NFT destination)
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = authority
    )]
    pub authority_ata: Account<'info, TokenAccount>,

    /// The project to withdraw from.
    #[account(
        mut,
        seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, Project>,

    /// The project token account to withdraw from (the NFT source)
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = project,
        constraint = project_ata.amount >= 1 @FuulError::InsufficientBalance,
    )]
    pub project_ata: Account<'info, TokenAccount>,

    /// The NFT mint being transferred (must have 0 decimals)
    #[account(
        constraint = token_mint.decimals == 0 @FuulError::InvalidTokenType
    )]
    pub token_mint: Account<'info, Mint>,

    /// The currency token to deposit.
    #[account(
        mut,
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()],
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,  

    /// The project currency budget keeps track of the budget balance
    #[account(
        mut,
        seeds = [PROJECT_CURRENCY_BUDGET_TAG.as_bytes(), project.key().as_ref(), currency_token.key().as_ref()],
        bump
    )]
    pub project_currency_budget: Account<'info, ProjectCurrencyBudget>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(project_nonce: u64, proof: [u8; 32])]
pub struct Claim<'info> {
    #[account(mut, signer)]
    pub authority: Signer<'info>,

    /// The project to claim from.
    #[account(mut, seeds = [PROJECT_TAG.as_bytes(), &project_nonce.to_le_bytes()], bump)]
    pub project: Account<'info, Project>,

    #[account(address = GLOBAL_CONFIG_ADDRESS,)]
    pub global_config: Account<'info, GlobalConfig>,

    /// The mint of the token being distributed (can be default pubkey for native tokens)
    /// CHECK: This is validated through the currency_token PDA lookup.
    pub token_mint: UncheckedAccount<'info>,

    /// CHECK: The fee collector account
    #[account(
        mut,
        constraint = fee_collector.key() == global_config.fee_management.fee_collector @FuulError::InvalidFeeCollector
    )]
    pub fee_collector: UncheckedAccount<'info>,

    /// The fee collector account
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = fee_collector
    )]
    pub fee_collector_ata: Option<Account<'info, TokenAccount>>,

    /// The currency token account
    #[account(
        mut,
        seeds = [CURRENCY_TOKEN_TAG.as_bytes(), token_mint.key().as_ref()],
        bump
    )]
    pub currency_token: Account<'info, CurrencyToken>,

    /// The token account owned by the project PDA (source of tokens)
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = project
    )]
    pub project_ata: Option<Account<'info, TokenAccount>>,

    /// The recipient's public key
    /// CHECK: This account is validated through the associated token account constraint below
    #[account(mut)]
    pub recipient: AccountInfo<'info>,
    
    /// The recipient's token account (destination of tokens)
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = recipient
    )]
    pub recipient_ata: Option<Account<'info, TokenAccount>>,

    // currency budget
    #[account(
        mut,
        seeds = [PROJECT_CURRENCY_BUDGET_TAG.as_bytes(), project.key().as_ref(), currency_token.key().as_ref()],
        bump
    )]
    pub project_currency_budget: Box<Account<'info, ProjectCurrencyBudget>>,

    /// Project attribution account, used to prevent replay attacks and simply record the attribution of the claim
    /// If this account already exists, the transaction will fail, preventing replay attacks
    #[account(
        init,
        payer = authority,
        space = ProjectAttribution::DISCRIMINATOR.len() + ProjectAttribution::INIT_SPACE,
        seeds = [
            PROJECT_ATTRIBUTION_TAG.as_bytes(),
            project.key().as_ref(),
            proof.as_ref(),
        ],
        bump
    )]
    pub project_attribution: Box<Account<'info, ProjectAttribution>>,

    /// The user stats account, used to track the user's stats
    #[account(
        init_if_needed,
        payer = authority,
        space = ProjectUser::DISCRIMINATOR.len() + ProjectUser::INIT_SPACE,
        seeds = [PROJECT_USER_TAG.as_bytes(), project.key().as_ref(), recipient.key().as_ref()],
        bump
    )]
    pub project_user: Box<Account<'info, ProjectUser>>,
    
    /// The sysvar containing the full transaction's instructions
    /// CHECK: Validated by requiring its well-known address
    #[account(address = ix_sysvar::Instructions::id())]
    pub instruction_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

}

//////////////////////////////// HANDLERS ////////////////////////////////

/// Deposits a fungible token into a project
/// 
/// Requirements:
///
/// - `project_nonce`: The nonce of the project
/// - `amount`: The amount of the fungible token to deposit
/// - Only project authorities can call this function.
impl<'info> DepositFungibleToken<'info> {
    #[allow(unused_variables)]
    pub fn deposit_fungible_token(&mut self, project_nonce: u64, amount: u64) -> Result<()> {
        require!( self.currency_token.is_active, FuulError::CurrencyTokenNotAccepted);
        require!( amount > 0, FuulError::ZeroValueNotAllowed);

        match self.currency_token.token_type {
            TokenType::Native => {
                // Not many checks needed for native tokens
                transfer_native(
                    &self.authority.to_account_info(),
                    &self.project.to_account_info(),
                    amount,
                    None,
                )?;
            }
            TokenType::FungibleSpl => {
                let authority_token_account =
                    self.authority_ata.as_ref().ok_or(FuulError::InvalidTokenMint)?;
                let project_vault_token_account =
                    self.project_ata.as_ref().ok_or(FuulError::InvalidTokenMint)?;

                // Transfer the tokens
                transfer_spl(
                    self.token_program.to_account_info(),
                    self.authority.to_account_info(),
                    authority_token_account.to_account_info(),
                    project_vault_token_account.to_account_info(),
                    amount,
                    None,
                )?;
            }
            _ => return Err(FuulError::InvalidTokenType.into()),
        }

        // update budget
        self.project_currency_budget.budget =
            self.project_currency_budget.budget.checked_add(amount).ok_or(FuulError::Overflow)?;
        self.project_currency_budget.token_mint = self.token_mint.key();
        self.project_currency_budget.token_account = self.project_ata.as_ref().map(|ata| ata.key());

        emit!(LogFungibleTokenDepositedEvent {
            project: self.project.key(),
            currency_token: self.currency_token.key(),
            amount,
        });

        Ok(())
    }
}

/// Deposits a single NFT into a project
/// 
/// Requirements:
///
/// - `project_nonce`: The nonce of the project
/// - The NFT must be owned by the authority
/// - The project must have a token account for the NFT mint
/// - The NFT mint must be a valid SPL token with 0 decimals (validated at constraint level)
impl<'info> DepositNonFungibleToken<'info> {
    #[allow(unused_variables)]
    pub fn deposit_non_fungible_token(&mut self, project_nonce: u64) -> Result<()> {
        require!(self.currency_token.is_active, FuulError::CurrencyTokenNotAccepted);

        // update budget
        self.project_currency_budget.budget =
            self.project_currency_budget.budget.checked_add(1).ok_or(FuulError::Overflow)?;
        self.project_currency_budget.token_mint = self.token_mint.key();
        self.project_currency_budget.token_account = Some(self.project_ata.key());

        // Transfer the NFT (amount = 1 for NFTs)
        transfer_spl(
            self.token_program.to_account_info(),
            self.authority.to_account_info(),
            self.authority_ata.to_account_info(),
            self.project_ata.to_account_info(),
            1,
            None,
        )?;

        emit!(LogNonFungibleTokenDepositedEvent {
            project: self.project.key(),
            authority: self.authority.key(),
            non_fungible_token_mint: self.token_mint.key(),
        });

        Ok(())
    }
}

/// Removes a single NFT from a project
/// 
/// Requirements:
///
/// - `project_nonce`: The nonce of the project
/// - The project must have the NFT
/// - Only project admins can call this function
impl<'info> RemoveNonFungibleToken<'info> {
    #[allow(unused_variables)]
    pub fn remove_non_fungible_token(&mut self, project_nonce: u64) -> Result<()> {
        // Update budget (decrement by 1 for the NFT being removed)
        self.project_currency_budget.budget =
            self.project_currency_budget.budget.checked_sub(1).ok_or(FuulError::Underflow)?;

        // Signer seeds for the project
        let project_nonce_bytes = project_nonce.to_le_bytes();
        let project_bump = get_project_bump(project_nonce, &crate::ID);
        let project_seeds = [
            PROJECT_TAG.as_bytes(),
            project_nonce_bytes.as_ref(),
            &[project_bump],
        ];
        let project_signer = &[&project_seeds[..]];

        // Transfer the NFT back to authority (amount = 1 for NFTs)
        transfer_spl(
            self.token_program.to_account_info(),
            self.project.to_account_info(),
            self.project_ata.to_account_info(),
            self.authority_ata.to_account_info(),
            1,
            Some(project_signer),
        )?;

        emit!(LogNonFungibleTokenRemovedEvent {
            project: self.project.key(),
            authority: self.authority.key(),
            non_fungible_token_mint: self.token_mint.key(),
        });

        Ok(())
    }
}

/// Remove/withdraw a currency token from the project
///
/// Requirements:
///
/// - `project_nonce`: The nonce of the project
/// - `amount`: The amount of the currency token to remove
/// - Only project admins can call this function.
impl<'info> RemoveFungibleToken<'info> {
    #[allow(unused_variables)]
    pub fn remove_fungible_token(&mut self, project_nonce: u64, amount: u64) -> Result<()> {
        let global_config = &self.global_config;
        let project = &self.project;

        // Validate inputs
        require!(amount > 0, FuulError::ZeroValueNotAllowed);

        // update budget, checked_sub automatically checks if the budget is greater than the amount
        self.project_currency_budget.budget =
            self.project_currency_budget.budget.checked_sub(amount).ok_or(FuulError::Underflow)?;

        // Signer seeds for the project
        let project_nonce_bytes = project_nonce.to_le_bytes();
        let project_bump = get_project_bump(project_nonce, &crate::ID);
        let project_seeds = [
            PROJECT_TAG.as_bytes(),
            project_nonce_bytes.as_ref(),
            &[project_bump],
        ];
        let project_signer = &[&project_seeds[..]];

        // compute the remove fee
        let remove_fee: u64 = project.get_remove_fee(global_config).into();
        let fee = remove_fee.checked_mul(amount)
            .ok_or(FuulError::Overflow)?
            .checked_div(BASIS_POINTS.into())
            .ok_or(FuulError::Overflow)?;
        
        // Enforce minimum fee if remove_fee is configured
        if remove_fee > 0 && fee == 0 {
            return Err(FuulError::AmountTooSmall.into());
        }

        let amount_after_fee = amount.checked_sub(fee).ok_or(FuulError::Underflow)?;

        // all good, transfer the tokens
        match self.currency_token.token_type {
            TokenType::Native => {
                // Remove the tokens from the project
                transfer_native(
                    &self.project.to_account_info(),
                    &self.authority.to_account_info(),
                    amount_after_fee,
                    Some(project_signer),
                )?;

                // Transfer the fee to the fee collector
                transfer_native(
                    &self.project.to_account_info(),
                    &self.fee_collector,
                    fee,
                    Some(project_signer),
                )?;
            }
            TokenType::FungibleSpl => {
                let authority_token_account =
                    self.authority_ata.as_ref().ok_or(FuulError::MissingAta)?;
                let project_vault_token_account =
                    self.project_ata.as_ref().ok_or(FuulError::MissingAta)?;
                let protocol_fee_collector_ata = 
                    self.protocol_fee_collector_ata.as_ref().ok_or(FuulError::MissingAta)?;

                // Transfer the tokens to the authority
                transfer_spl(
                    self.token_program.to_account_info(),
                    self.project.to_account_info(),
                    project_vault_token_account.to_account_info(),
                    authority_token_account.to_account_info(),
                    amount_after_fee,
                    Some(project_signer),
                )?;

                // Transfer the fee to the fee collector
                transfer_spl(
                    self.token_program.to_account_info(),
                    self.project.to_account_info(),
                    project_vault_token_account.to_account_info(),
                    protocol_fee_collector_ata.to_account_info(),
                    fee,
                    Some(project_signer),
                )?;
            }
            _ => return Err(FuulError::InvalidTokenType.into()),
        }

        emit!(LogFungibleTokenRemovedEvent {
            project: self.project.key(),
            currency_token: self.currency_token.key(),
            amount,
            fee,
        });

        Ok(())
    }
}

/// Claims a currency token from the project budget
/// 
/// Parameters:
/// 
/// - `project_nonce`: The nonce of the project
/// - `proof`: The unique identifier for the claim
impl<'info> Claim<'info> {
    #[allow(unused_variables)]
    pub fn claim(&mut self, project_nonce: u64, proof: [u8; 32]) -> Result<()> {
        let project  = &mut self.project;
        let global_config = &self.global_config;

        // Load the instruction sysvar account (holds all tx instructions)
        let ix_sysvar_account = self.instruction_sysvar.to_account_info();

        // recover signers and message from the transaction
        let (signers, message) = verify_ed25519_signature(&ix_sysvar_account)?;

        // Check which of the ed25519 signers have Signer role in global config
        let signer_count = signers
            .iter()
            .filter(|signer| global_config.roles_mapping.has_role(**signer, GlobalRole::Signer))
            .count();
        require!(signer_count >= global_config.required_signers_for_claim.into(), FuulError::NotEnoughValidSigners);

        // Recover the message data
        let claim = ClaimMessage::try_from_slice(&message)
            .map_err(|_| FuulError::InvalidMessageDate)?;

        // verify accounts provided match the message data
        require!(project.key() == claim.data.project, FuulError::SignedMessageMismatch);
        require!(self.recipient.key() == claim.data.recipient, FuulError::SignedMessageMismatch);
        require!(self.token_mint.key() == claim.data.token_mint, FuulError::SignedMessageMismatch);

        // Validate proof parameters match signed message
        require!(proof == claim.data.proof, FuulError::SignedMessageMismatch);

        // Validate message domain, deadline, program id, etc
        validate_message_domain(&claim.domain)?;

        // Initialize the nullifier to mark this nonce as used
        // If this nonce was already used, the init constraint above would have failed
        self.project_attribution.set_inner(ProjectAttribution { 
            nonce: project.attributions_count,
            token_mint: self.token_mint.key(),
            amount: claim.data.amount,
            recipient: self.recipient.key(),
            timestamp: Clock::get()?.unix_timestamp,
            proof,
        });
        project.attributions_count += 1;

        // update user stats
        self.project_user.total_claims += 1;
        self.project_user.authority = self.recipient.key();

        // Check claim limit per cooldown
        require!(claim.data.amount <= self.currency_token.claim_limit_per_cooldown, FuulError::ClaimLimitExceeded);

        if  self.currency_token.claim_cooldown_period_started + self.global_config.claim_cool_down as i64 > Clock::get()?.unix_timestamp {
            // If cooldown not ended -> check that the limit is not reached and then sum amount to cumulative

            let new_cumulative = self.currency_token.cumulative_claim_per_cooldown.checked_add(claim.data.amount).ok_or(FuulError::Overflow)?;
            if new_cumulative > self.currency_token.claim_limit_per_cooldown {
                return Err(FuulError::ClaimLimitExceeded.into());
            }

            self.currency_token.cumulative_claim_per_cooldown = new_cumulative;
        } else  {
            // If cooldown ended -> set new values for cumulative and time (amount limit is checked before)
           
            self.currency_token.cumulative_claim_per_cooldown = claim.data.amount;
            self.currency_token.claim_cooldown_period_started = Clock::get()?.unix_timestamp;
        }
        
        // Recover the signer to sign for the transfers
        let project_nonce_bytes = project_nonce.to_le_bytes();
        let project_bump = get_project_bump(project_nonce, &crate::ID);
        let project_seeds = [
            PROJECT_TAG.as_bytes(),
            project_nonce_bytes.as_ref(),
            &[project_bump],
        ];
        let project_signer = &[&project_seeds[..]];

        // Get project claim fee
        let project_claim_fee = project.get_project_claim_fee(global_config);
        let project_claim_fee_amount = if claim.data.token_type == TokenType::NonFungibleSpl {
            0
        } else {
            claim.data.amount
                .checked_mul(project_claim_fee.into())
                .ok_or(FuulError::Overflow)?
                .checked_div(BASIS_POINTS.into())
                .ok_or(FuulError::Overflow)?
        };

        // reduce budget
        let total_to_deduct = claim.data.amount.checked_add(project_claim_fee_amount).ok_or(FuulError::Overflow)?;
        self.project_currency_budget.budget =
                self.project_currency_budget.budget.checked_sub(total_to_deduct).ok_or(FuulError::Underflow)?;

        // Transfer user native claim fee to collector (paid by the claimer/authority)
        // NOTE: This must happen BEFORE manual lamport adjustments to avoid UnbalancedInstruction
        // errors when authority == recipient (same account modified by both system_instruction and manual adjustment)
        if project.get_user_native_claim_fee(global_config) > 0 && !global_config.fee_management.no_claim_fee_whitelist.contains(&self.authority.key()) {
            transfer_native(
                &self.authority.to_account_info(),
                &self.fee_collector,
                project.get_user_native_claim_fee(global_config),
                None, // authority is a Signer, not a PDA, so no signer seeds needed
            )?;
        }

        // transfer the tokens to the recipient
        if claim.data.token_type == TokenType::Native {
            self.project_user.total_native_claimed = self.project_user.total_native_claimed.checked_add(claim.data.amount).ok_or(FuulError::Overflow)?;

            transfer_native(
                &project.to_account_info(),
                &self.recipient,
                claim.data.amount,
                Some(project_signer),
            )?;

            // Transfer project claim fee to fee collector
            if project_claim_fee_amount > 0 {
                transfer_native(
                    &project.to_account_info(),
                    &self.fee_collector,
                    project_claim_fee_amount,
                    Some(project_signer),
                )?;
            }
        } else {
            if claim.data.token_type == TokenType::NonFungibleSpl && claim.data.amount != 1 {
                // Solana nfts must be claimed in 1s
                return Err(FuulError::InvalidClaimAmount.into());
            }

            // Check accounts were provided
            let recipient_ata =
                self.recipient_ata.as_ref().ok_or(FuulError::InvalidTokenMint)?;
            let project_vault_ata =
                self.project_ata.as_ref().ok_or(FuulError::InvalidTokenMint)?;
            let fee_collector_ata =
                self.fee_collector_ata.as_ref().ok_or(FuulError::InvalidTokenMint)?;

            // Transfer the tokens
            transfer_spl(
                self.token_program.to_account_info(),
                project.to_account_info(),
                project_vault_ata.to_account_info(),
                recipient_ata.to_account_info(),
                claim.data.amount,
                Some(project_signer),
            )?;

            // Transfer project claim fee to fee collector
            if project_claim_fee_amount > 0 {
                transfer_spl(
                    self.token_program.to_account_info(),
                    project.to_account_info(),
                    project_vault_ata.to_account_info(),
                    fee_collector_ata.to_account_info(),
                    project_claim_fee_amount,
                    Some(project_signer),
                )?;
            }
        }

        emit!(LogClaimedFromProjectBudgetEvent {
            project: self.project.key(),
            amount: claim.data.amount,
        });

        Ok(())
    }
}

//////////////////////////////// EVENTS ////////////////////////////////

/// Log the deposit of a fungible token into a project
/// Parameters:
/// - `project`: The project that deposited the fungible token
/// - `currency_token`: The currency token that was deposited
/// - `amount`: The amount of the fungible token that was deposited
#[event]
pub struct LogFungibleTokenDepositedEvent {
    pub project: Pubkey,
    pub currency_token: Pubkey,
    pub amount: u64,
}

/// Log the removal of a currency token from the project
/// Parameters:
///     - project: The project that removed the currency token
///     - currency_token: The currency token that was removed
///     - amount: The amount of the currency token that was removed
///     - fee: The fee that was removed
#[event]
pub struct LogFungibleTokenRemovedEvent {
    pub project: Pubkey,
    pub currency_token: Pubkey,
    pub amount: u64,
    pub fee: u64,
}

/// Log the deposit of an NFT into a project
/// Parameters:
/// - `project`: The project that received the NFT
/// - `authority`: The authority that deposited the NFT
/// - `nft_mint`: The NFT mint that was deposited
#[event]
pub struct LogNonFungibleTokenDepositedEvent {
    pub project: Pubkey,
    pub authority: Pubkey,
    pub non_fungible_token_mint: Pubkey,
}

/// Log the removal of an NFT from a project
/// Parameters:
/// - `project`: The project that removed the NFT
/// - `authority`: The authority that withdrew the NFT
/// - `nft_mint`: The NFT mint that was removed
#[event]
pub struct LogNonFungibleTokenRemovedEvent {
    pub project: Pubkey,
    pub authority: Pubkey,
    pub non_fungible_token_mint: Pubkey,
}

/// Log the claim of a currency token from the project budget
/// Parameters:
/// - `project`: The project that claimed the currency token
#[event]
pub struct LogClaimedFromProjectBudgetEvent {
    pub project: Pubkey,
    pub amount: u64,
}
