# Fuul Solana Program Documentation

## Table of Contents
1. [Overview](#overview)
2. [State Accounts](#state-accounts)
3. [Program Instructions](#program-instructions)
4. [Utility Modules](#utility-modules)
5. [Security Considerations](#security-considerations)
6. [Integration guide](#integration-guide)
7. [Glossary](#glossary)

---

## Overview

The Fuul Solana Program is a comprehensive attribution and rewards distribution system built on Solana. It enables projects to create reward budgets in various tokens (native SOL, fungible SPL tokens, and NFTs) and distribute them to users through a secure, signature-verified claim mechanism. The program implements role-based access control, fee management, and claim rate limiting to provide a robust rewards infrastructure.

**Program ID:** `7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg`

---

## State Accounts

### 1. GlobalConfig

The central configuration account for the entire protocol. This is the first account created during program initialization.

**PDA Seeds:** `["global-config"]`  
**Address:** `6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY`

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `is_initialized` | `bool` | Initialization flag |
| `paused` | `bool` | Global pause state for the protocol |
| `project_nonce` | `u64` | Counter for creating unique project PDAs |
| `claim_cool_down` | `u64` | Cooldown period (in seconds) for resetting claim limits |
| `required_signers_for_claim` | `u8` | Number of valid signatures required for claims |
| `fee_management` | `FeeManagement` | Global fee configuration |
| `roles_mapping` | `GlobalRolesMapping` | Global role assignments |

#### FeeManagement Structure

| Field | Type | Description |
|-------|------|-------------|
| `fee_collector` | `Pubkey` | Address receiving protocol fees |
| `no_claim_fee_whitelist` | `Vec<Pubkey>` | Addresses exempt from user claim fees (max 100) |
| `user_native_claim_fee` | `u64` | Fee in lamports paid by users per claim |
| `project_claim_fee` | `u64` | Fee in basis points paid by projects (0-10000) |
| `remove_fee` | `u64` | Fee in basis points for fund removal (0-10000) |

#### Global Roles

- **Admin:** Can update config, manage fees, currencies, and roles
- **Pauser:** Can pause the protocol
- **Unpauser:** Can unpause the protocol
- **Signer:** Authorized to sign claim messages

**Role Management Methods:**
- `grant_role(account, role)` - Assign a role to an account
- `revoke_role(account, role)` - Remove a role from an account
- `has_role(account, role)` - Check if account has specific role
- `count_roles(role)` - Count accounts with specific role

---

### 2. CurrencyToken

Represents a whitelisted token that can be used for rewards distribution.

**PDA Seeds:** `["currency-token", token_mint]`

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `is_initialized` | `bool` | Initialization flag |
| `token_mint` | `Pubkey` | The SPL token mint address (default pubkey for native SOL) |
| `token_type` | `TokenType` | Type of token (Native, FungibleSpl, NonFungibleSpl) |
| `is_active` | `bool` | Whether token is currently accepted |
| `claim_limit_per_cooldown` | `u64` | Maximum claimable amount during cooldown period |
| `cumulative_claim_per_cooldown` | `u64` | Running total of claims in current period |
| `claim_cooldown_period_started` | `i64` | Unix timestamp when current cooldown began |

#### TokenType Enum
```rust
enum TokenType {
    Native,          // SOL
    FungibleSpl,     // SPL tokens with decimals
    NonFungibleSpl,  // NFTs (0 decimals)
}
```

**Cooldown Mechanism:**
- When `current_time > claim_cooldown_period_started + claim_cool_down`:
  - Reset `cumulative_claim_per_cooldown` to current claim amount
  - Update `claim_cooldown_period_started` to current time
- Otherwise:
  - Add to `cumulative_claim_per_cooldown`
  - Reject if exceeds `claim_limit_per_cooldown`

---

### 3. Project

Represents a project that distributes rewards to users.

**PDA Seeds:** `["project", project_nonce]`

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `is_initialized` | `bool` | Initialization flag |
| `nonce` | `u64` | Unique project identifier |
| `metadata_uri` | `String` | URI to project metadata (max 256 chars) |
| `fee_management` | `ProjectFeeManagement` | Project-specific fee overrides |
| `roles_mapping` | `ProjectRolesMapping` | Project role assignments |

#### ProjectFeeManagement Structure

All fields are `Option<u64>` allowing projects to override global defaults:

| Field | Description |
|-------|-------------|
| `user_native_claim_fee` | Override for user claim fee |
| `project_claim_fee` | Override for project claim fee (basis points) |
| `remove_fee` | Override for removal fee (basis points) |

**Fee Resolution Methods:**
- `get_user_native_claim_fee(global_config)` - Returns project override or global default
- `get_project_claim_fee(global_config)` - Returns project override or global default
- `get_remove_fee(global_config)` - Returns project override or global default

#### Project Roles

- **Admin:** Full control over project configuration, budget, and roles

**Role Management Methods:**
- `grant_role(account, role)` - Assign project role
- `revoke_role(account, role)` - Remove project role
- `has_role(account, role)` - Check project role
- `count_roles(role)` - Count accounts with role

---

### 4. ProjectCurrencyBudget

Tracks the available balance for a specific token within a project.

**PDA Seeds:** `["project-currency-budget", project, currency_token]`

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `budget` | `u64` | Available token balance for distribution |
| `token_mint` | `Pubkey` | The token mint address |
| `token_account` | `Option<Pubkey>` | Associated token account (for SPL tokens) |

**Usage:**
- Incremented during deposits
- Decremented during claims and removals
- Prevents over-distribution through checked arithmetic

---

### 5. ProjectAttribution

Nullifier account preventing replay attacks and recording claim history.

**PDA Seeds:** `["project-attribution", project, proof]`

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `nonce` | `u64` | Unique nonce from signed message |
| `token_mint` | `Pubkey` | Token being claimed |
| `amount` | `u64` | Claim amount |
| `recipient` | `Pubkey` | Recipient address |
| `proof` | `[u8; 32]` | Keccak hash proof binding claim to project |
| `timestamp` | `i64` | Unix timestamp of claim |

**Purpose:**
- Created during `claim_from_project_budget` instruction
- Uses `init` constraint - fails if proof already used
- Provides immutable claim audit trail

---

### 6. ProjectUser

Tracks statistics for each user within a project.

**PDA Seeds:** `["project-user", project, user_authority]`

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | User's public key |
| `project` | `Pubkey` | Associated project |
| `total_claims` | `u64` | Number of successful claims |
| `total_native_claimed` | `u64` | Total SOL claimed (lamports) |

**Usage:**
- Auto-initialized on first claim (`init_if_needed`)
- Updated with each successful claim
- Enables user analytics and reputation tracking

---

## Program Instructions

### Admin Instructions

#### 1. create_global_config
**Authority Required:** Any (first caller becomes admin)

Initializes the protocol with default configuration.

**Parameters:**
- `fee_collector: Pubkey` - Initial fee collector address

**Effects:**
- Creates GlobalConfig account
- Sets default cooldown (86400s / 1 day)
- Grants all roles to initializer
- Fails if already initialized

---

#### 2. update_global_config
**Authority Required:** Admin

Updates core protocol parameters.

**Parameters:**
- `claim_cool_down: Option<u64>` - New cooldown period
- `required_signers_for_claim: Option<u8>` - New signature requirement

**Validations:**
- Values must differ from current
- `claim_cool_down` cannot be zero
- At least one parameter required

---

#### 3. update_global_config_fees
**Authority Required:** Admin

Updates all fee-related settings in one transaction.

**Parameters:**
- `fee_collector: Option<Pubkey>` - New fee collector
- `user_native_claim_fee: Option<u64>` - New user fee (lamports)
- `project_claim_fee: Option<u64>` - New project fee (basis points)
- `remove_fee: Option<u64>` - New removal fee (basis points)

**Validations:**
- At least one parameter required
- Values must differ from current
- Percentage fees must be ≤ 10000 (100%)
- Fee collector cannot be default pubkey

---

#### 4. add_no_claim_fee_whitelist
**Authority Required:** Admin

Exempts an address from user claim fees.

**Parameters:**
- `account: Pubkey` - Address to whitelist

**Validations:**
- Account not already whitelisted
- Whitelist size < 100

---

#### 5. remove_no_claim_fee_whitelist
**Authority Required:** Admin

Removes an address from fee exemption.

**Parameters:**
- `account: Pubkey` - Address to remove

**Validations:**
- Account currently whitelisted

---

### Pause Control Instructions

#### 6. pause_program
**Authority Required:** Pauser

Halts all claim operations.

**Effects:**
- Sets `global_config.paused = true`
- Blocks `claim_from_project_budget` calls

---

#### 7. unpause_program
**Authority Required:** Unpauser

Resumes claim operations.

**Effects:**
- Sets `global_config.paused = false`

---

### Global Role Management

#### 8. grant_global_role
**Authority Required:** Admin

Assigns a global role to an account.

**Parameters:**
- `account: Pubkey` - Target account
- `role: GlobalRole` - Role to grant

**Validations:**
- Account doesn't already have role

---

#### 9. revoke_global_role
**Authority Required:** Admin

Removes a global role from an account.

**Parameters:**
- `account: Pubkey` - Target account
- `role: GlobalRole` - Role to revoke

**Validations:**
- Cannot revoke own roles
- Account currently has role

---

#### 10. renounce_global_role
**Authority Required:** Self

Voluntarily gives up a global role.

**Parameters:**
- `role: GlobalRole` - Role to renounce

**Validations:**
- Cannot renounce Admin if last admin

---

### Currency Token Management

#### 11. add_currency_token
**Authority Required:** Admin

Whitelists a new token for use in the protocol.

**Parameters:**
- `token_type: TokenType` - Native, FungibleSpl, or NonFungibleSpl
- `claim_limit_per_cooldown: u64` - Maximum claimable per period

**Effects:**
- Creates CurrencyToken account
- Sets initial cooldown state
- Token starts active

---

#### 12. update_currency_token_limit
**Authority Required:** Admin

Modifies limits or active status for a currency.

**Parameters:**
- `claim_limit_per_cooldown: Option<u64>` - New limit
- `is_active: Option<bool>` - Active/inactive state

**Validations:**
- At least one parameter required
- New limit cannot be below current cumulative
- Values must differ from current

---

#### 13. remove_currency_token
**Authority Required:** Admin

Closes a currency token account.

**Effects:**
- Transfers rent to authority
- Account must be inactive
- Cannot be used if projects have active budgets

---

### Project Instructions

#### 14. create_project
**Authority Required:** Any

Creates a new project for rewards distribution.

**Parameters:**
- `admin: Pubkey` - Initial project admin
- `metadata_uri: String` - URI to project metadata (max 256 chars)

**Effects:**
- Creates Project account with incremented nonce
- Grants Admin role to specified account
- Sets default fee overrides (None)
- Increments `global_config.project_nonce`

---

#### 15. update_project_config
**Authority Required:** Project Admin

Updates project metadata.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `metadata_uri: String` - New metadata URI

**Validations:**
- URI must differ from current

---

#### 16. update_project_fees
**Authority Required:** Global Admin

Updates fee overrides for a specific project.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `user_native_claim_fee: Option<u64>` - User fee override
- `project_claim_fee: Option<u64>` - Project fee override
- `remove_fee: Option<u64>` - Removal fee override

**Validations:**
- Percentage fees must be ≤ 10000
- At least one parameter required

---

### Project Role Management

#### 17. grant_project_role
**Authority Required:** Project Admin

Assigns a project role.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `account: Pubkey` - Target account
- `role: ProjectRole` - Role to grant

---

#### 18. revoke_project_role
**Authority Required:** Project Admin

Removes a project role.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `account: Pubkey` - Target account
- `role: ProjectRole` - Role to revoke

**Validations:**
- Cannot revoke own roles

---

#### 19. renounce_project_role
**Authority Required:** Self

Voluntarily gives up a project role.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `role: ProjectRole` - Role to renounce

**Validations:**
- Cannot renounce Admin if last admin

---

### Project Budget Management

#### 20. deposit_fungible_token
**Authority Required:** Any

Deposits fungible tokens (SOL or SPL) into a project.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `amount: u64` - Amount to deposit

**Process:**
1. Validates currency is active
2. Transfers tokens from authority to project
3. Increments `project_currency_budget.budget`
4. For SPL: requires authority and project ATAs
5. For Native: transfers directly to project PDA

**Validations:**
- Amount > 0
- Currency token is active
- Token type is Native or FungibleSpl

---

#### 21. deposit_non_fungible_token
**Authority Required:** Any

Deposits a single NFT into a project.

**Parameters:**
- `project_nonce: u64` - Project identifier

**Process:**
1. Validates NFT mint has 0 decimals
2. Transfers NFT (amount=1) from authority to project
3. Increments budget by 1

**Validations:**
- Authority owns the NFT
- Token type is NonFungibleSpl
- Currency token is active

---

#### 22. remove_fungible_token
**Authority Required:** Project Admin

Withdraws fungible tokens from project budget.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `amount: u64` - Amount to withdraw

**Fee Calculation:**
```rust
remove_fee = project.get_remove_fee(global_config)  // basis points
fee = (amount * remove_fee) / 10000
amount_after_fee = amount - fee
```

**Process:**
1. Decrements budget
2. Transfers `amount_after_fee` to admin
3. Transfers `fee` to protocol fee collector

**Validations:**
- Amount > 0
- Sufficient budget
- Admin has required ATAs (for SPL tokens)

---

#### 23. remove_non_fungible_token
**Authority Required:** Project Admin

Withdraws a single NFT from project.

**Parameters:**
- `project_nonce: u64` - Project identifier

**Process:**
1. Decrements budget by 1
2. Transfers NFT (amount=1) to admin

**Validations:**
- Project owns the NFT
- Admin has required ATA

---

#### 24. Claim
**Authority Required:** Any (with valid signatures)

Core claim instruction allowing users to receive rewards with off-chain authorization.

**Parameters:**
- `project_nonce: u64` - Project identifier
- `proof: [u8; 32]` - Keccak hash binding claim to project
- `proof_without_project: [u8; 32]` - Base proof for verification

**Signed Message Structure:**
```rust
struct ClaimFromProjectBudgetMessage {
    data: {
        amount: u64,
        project: Pubkey,
        recipient: Pubkey,
        token_type: TokenType,
        token_mint: Pubkey,
        proof: [u8; 32],
        proof_without_project: [u8; 32],
        reason: ClaimReason,  // AffiliatePayout or EndUserPayout
    },
    domain: {
        program_id: Pubkey,
        version: u8,
        deadline: i64,
    }
}
```

**Verification Process:**

1. **Signature Validation:**
   - Extracts Ed25519 signatures from instruction sysvar
   - Counts signers with GlobalRole::Signer
   - Requires ≥ `required_signers_for_claim` valid signatures

> Note: Signature verification relies on an Ed25519 program instruction immediately before this one that includes all required signatures. Due to Solana's transaction size limit (1232 bytes), only up to 3 signatures fit for native claims, and just 1 for SPL tokens. Supporting more signers would require an alternative multisig attribution design.

2. **Message Domain Validation:**
   - `program_id` must match program ID
   - `version` must match VERSION constant (1)
   - `deadline` must be > current timestamp

3. **Proof Validation:**
   ```rust
   keccak([proof_without_project, project].concat()) == proof
   ```

4. **Account Matching:**
   - Validates all accounts match signed message data

5. **Cooldown Limit Check:**
   
   - Single claim cannot exceed `claim_limit_per_cooldown`
   - If cooldown not expired: sum must not exceed limit
   - If cooldown expired: reset cumulative and timestamp

**Fee Calculation:**
```rust
// Project claim fee (paid from project budget)
project_fee = (amount * project_claim_fee) / 10000

// User claim fee (paid by authority)
user_fee = project.get_user_native_claim_fee(global_config)
// Exempt if authority in no_claim_fee_whitelist
```

**Process Flow:**
1. Verify signatures and decode message
2. Create ProjectAttribution (fails if proof reused)
3. Update ProjectUser stats
4. Check cooldown limits
5. Transfer tokens to recipient
6. Transfer project fee to fee collector (from project)
7. Transfer user fee to fee collector (from authority)
8. Decrement budget by `amount + project_fee`

**Special Cases:**
- **NFTs:** `project_claim_fee` not applied (amount must be 1)
- **Native transfers:** Direct lamport transfers
- **SPL transfers:** Requires ATAs for recipient and fee collector

**Validations:**
- Program not paused
- Sufficient valid signatures
- Proof not previously used
- Deadline not expired
- Within cooldown limits
- Sufficient project budget

---

## Utility Modules

### control.rs

Access control modifiers used with `#[access_control()]` macro.

#### has_global_role
```rust
fn has_global_role(
    global_config: &GlobalConfig,
    authority: &AccountInfo,
    role: GlobalRole
) -> Result<()>
```
Validates authority has specific global role.

#### has_project_role
```rust
fn has_project_role(
    project: &Project,
    authority: &AccountInfo,
    role: ProjectRole
) -> Result<()>
```
Validates authority has specific project role.

#### is_not_paused
```rust
fn is_not_paused(global_config: &GlobalConfig) -> Result<()>
```
Validates protocol is not paused.

---

### signatures.rs

Ed25519 signature verification utilities for off-chain signed messages.

#### Key Structures

**MessageDomain:**
```rust
struct MessageDomain {
    program_id: Pubkey,  // Must match crate::ID
    version: u8,         // Must match VERSION (1)
    nonce: u64,          // Unique identifier for replay protection
    deadline: i64,       // Unix timestamp expiration
}
```

**Ed25519SignatureOffsets:**
```rust
struct Ed25519SignatureOffsets {
    signature_offset: usize,
    signature_instruction_index: u16,
    public_key_offset: usize,
    public_key_instruction_index: u16,
    message_data_offset: usize,
    message_data_size: usize,
    message_instruction_index: u16,
}
```

#### Key Functions

**validate_message_domain:**
```rust
fn validate_message_domain(domain: &MessageDomain) -> Result<()>
```
Ensures:
- Program ID matches
- Version matches
- Deadline not expired

**verify_ed25519_signature:**
```rust
fn verify_ed25519_signature(
    ix_sysvar_account: &AccountInfo
) -> Result<(Vec<Pubkey>, Vec<u8>)>
```
Returns:
- `Vec<Pubkey>`: All signer public keys
- `Vec<u8>`: Signed message bytes

**Process:**
1. Loads current instruction index from sysvar
2. Validates previous instruction is Ed25519 program
3. Parses Ed25519 instruction data format
4. Extracts all signatures and public keys
5. Returns signers and message (already verified by Ed25519 program)

**parse_ed25519_ix_data:**
Parses Ed25519 instruction format:
```
[signature_count: u8][padding: u8]
[sig1_offsets: 7 x u16][sig2_offsets: 7 x u16]...
[signature_data][pubkey_data][message_data]
```

---

### transfer.rs

Token transfer utilities supporting both native and SPL tokens.

#### transfer_native
```rust
fn transfer_native<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
    signer: Option<&[&[&[u8]]]>
) -> Result<()>
```

**Behavior:**
- If `from` has data (PDA): Manual lamport adjustment
- If `from` no data: System program transfer instruction
- Supports PDA signing with seeds

**Use Cases:**
- SOL deposits: `signer = None`
- SOL withdrawals from project: `signer = Some(project_seeds)`

#### transfer_spl
```rust
fn transfer_spl<'info>(
    token_program: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
    signer: Option<&[&[&[u8]]]>
) -> Result<()>
```

**Behavior:**
- Uses SPL Token program CPI
- Supports PDA signing for project withdrawals
- Requires proper token account authorities

---

### bumps.rs

PDA derivation utilities.

#### get_project_bump
```rust
fn get_project_bump(
    project_nonce: u64,
    program_id: &Pubkey
) -> u8
```

Returns bump seed for project PDA. Used to construct signer seeds:
```rust
let project_seeds = [
    PROJECT_TAG.as_bytes(),
    project_nonce.to_le_bytes().as_ref(),
    &[bump]
];
```

---

## Security Considerations

### 1. Replay Attack Prevention
- **ProjectAttribution** uses `init` constraint with `[project, proof]` seeds
- Each unique proof can only be used once
- Nonce in message domain provides additional uniqueness

### 2. Signature Verification
- Leverages Solana's Ed25519 precompile for cryptographic verification
- Requires minimum number of valid signers (configurable)
- Validates signers have GlobalRole::Signer
- Checks message domain (program_id, version, deadline)

### 3. Access Control
- Role-based permissions at global and project levels
- Prevents self-revocation
- Prevents last admin removal
- Separate roles for pause/unpause operations

### 4. Arithmetic Safety
- All arithmetic uses checked operations (`checked_add`, `checked_sub`, `checked_mul`, `checked_div`)
- Returns `Overflow`/`Underflow` errors on failure

### 5. Fee Validation
- Percentage fees capped at 10000 (100%)
- Fee collector cannot be default pubkey
- Whitelist for fee exemptions

### 6. Cooldown Protection
- Prevents excessive claims within time period
- Per-token limit enforcement
- Automatic reset after cooldown expiration

### 7. Account Validation
- Extensive constraint checks on all accounts
- ATA ownership verification
- Token mint matching
- PDA derivation validation

---

## Integration Guide

### For Project Creators

1. **Setup:**
   ```typescript
   // Ensure GlobalConfig exists and currency is whitelisted
   await program.methods.createProject(adminPubkey, metadataUri).rpc();
   ```

2. **Fund Project:**
   ```typescript
   // Deposit tokens
   await program.methods
     .depositFungibleToken(projectNonce, amount)
     .accounts({ /* ... */ })
     .rpc();
   ```

3. **Configure Fees (Optional):**
   ```typescript
   // Override global fees
   await program.methods
     .updateProjectFees(projectNonce, userFee, projectFee, removeFee)
     .rpc();
   ```

## Glossary

- **PDA (Program Derived Address):** Deterministic address controlled by program
- **Basis Points:** 1/100th of a percent (100 bp = 1%, 10000 bp = 100%)
- **Cooldown Period:** Time window for rate limiting claims
- **Nullifier:** Account preventing replay attacks (ProjectAttribution)
- **ATA (Associated Token Account):** Canonical token account for owner/mint pair
- **Signer:** Account with GlobalRole::Signer authorized to sign claim messages
- **Proof:** Keccak hash binding claim to specific project
- **Nonce:** Unique identifier preventing message replay
- **Ed25519:** Elliptic curve signature algorithm used by Solana
- **CPI (Cross-Program Invocation):** Program calling another program
- **Sysvar:** System account providing blockchain state (e.g., Instructions, Clock)

---

