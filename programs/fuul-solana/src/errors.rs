use anchor_lang::error_code;

/// @dev Error codes for the Fuul program.
/// @dev The error codes are in the range of 6000 to 6999.
#[error_code]
pub enum FuulError {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized, // 6000
    #[msg("Invalid fee collector.")]
    InvalidFeeCollector, // 6001
    #[msg("Zero value not allowed.")]
    ZeroValueNotAllowed, // 6002
    #[msg("Program is paused.")]
    ProgramPaused, // 6003
    #[msg("No new changes.")]
    NoNewChanges, // 6004
    #[msg("Currency token already accepted.")]
    CurrencyTokenAlreadyAccepted, // 6005
    #[msg("Currency token not accepted.")]
    CurrencyTokenNotAccepted, // 6006
    #[msg("Invalid token type.")]
    InvalidTokenType, // 6007
    #[msg("Limit already set.")]
    LimitAlreadySet, // 6008
    #[msg("Invalid token mint.")]
    InvalidTokenMint, // 6010
    #[msg("Role already exists.")]
    RoleAlreadyExists, // 6011
    #[msg("Overflow.")]
    Overflow, // 6012
    #[msg("Underflow.")]
    Underflow, // 6013
    #[msg("Already initialized.")]
    AlreadyInitialized, // 6014
    #[msg("Cannot revoke self.")]
    CannotRevokeSelf, // 6017
    #[msg("Cannot renounce last admin.")]
    CannotRenounceLastAdmin, // 6018
    #[msg("Limit below cumulative.")]
    LimitBelowCumulative, // 6019
    #[msg("Nothing to update.")]
    NothingToUpdate, // 6020
    #[msg("Invalid account data.")]
    InvalidAccountData, // 6021
    #[msg("Insufficient balance.")]
    InsufficientBalance, // 6022
    #[msg("Program ID mismatch.")]
    ProgramIdMismatch, // 6023
    #[msg("Version mismatch.")]
    VersionMismatch, // 6024
    #[msg("Deadline expired.")]
    DeadlineExpired, // 6025
    #[msg("Nonce mismatch.")]
    NonceMismatch, // 6026
    #[msg("Invalid instruction sysvar.")]
    InvalidInstructionSysvar, // 6027
    #[msg("Bad Ed25519 program.")]
    BadEd25519Program, // 6028
    #[msg("Bad Ed25519 accounts.")]
    BadEd25519Accounts, // 6029
    #[msg("Invalid instruction data.")]
    InvalidInstructionData, // 6030
    #[msg("Not enough valid signers.")]
    NotEnoughValidSigners, // 6031
    #[msg("Invalid message date.")]
    InvalidMessageDate, // 6032
    #[msg("Signed message mismatch.")]
    SignedMessageMismatch, // 6033
    #[msg("Invalid token amount.")]
    InvalidClaimAmount, // 6034
    #[msg("Claim limit exceeded.")]
    ClaimLimitExceeded, // 6035
    #[msg("Invalid ata owner.")]
    InvalidAtaOwner, // 6036
    #[msg("Missing ata.")]
    MissingAta, // 6037
    #[msg("Invalid percentage.")]
    InvalidPercentage, // 6038
    #[msg("Invalid proof.")]
    InvalidProof, // 6039
    #[msg("Already in whitelist.")]
    AlreadyInWhitelist, // 6040
    #[msg("Not in whitelist.")]
    NotInWhitelist, // 6041
    #[msg("Whitelist full.")]
    WhitelistFull, // 6042
    #[msg("Max roles reached.")]
    MaxRolesReached, // 6043
    #[msg("Insufficient funds.")]
    InsufficientFunds, // 6044
}
