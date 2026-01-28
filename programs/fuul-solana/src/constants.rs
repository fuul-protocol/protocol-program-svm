use anchor_lang::prelude::*;

/// Version of the protocol
pub const VERSION: u8 = 1;

/// Tag for the global config account
pub const GLOBAL_CONFIG_TAG: &str = "global-config";

/// Tag for the project account
pub const PROJECT_TAG: &str = "project";

/// Tag for the project attribution account
pub const PROJECT_ATTRIBUTION_TAG: &str = "project-attribution";

/// Tag for the project user account
pub const PROJECT_USER_TAG: &str = "project-user";

/// Tag for the project budget account
pub const PROJECT_CURRENCY_BUDGET_TAG: &str = "project-currency-budget";

/// Tag for the currency token account
pub const CURRENCY_TOKEN_TAG: &str = "currency-token";

/// Global config address
pub const GLOBAL_CONFIG_ADDRESS: Pubkey = pubkey!("BvaeXyfbPf5hxcKLuwXvLfhjSCVmXtHhH1YSJmW46GvV");
pub const GLOBAL_CONFIG_BUMP: u8 = 253;

/// Maximum size of the ROLES_MAPPING account
pub const MAX_ROLES_MAPPING_SIZE: usize = 100;

/// Basis points denominator (10000 = 100%)
pub const BASIS_POINTS: u16 = 10000;

/// Maximum length of the metadata URI
pub const MAX_METADATA_URI_LENGTH: usize = 256;

/// Maximum size of the NO_CLAIM_FEE_WHITELIST account
pub const MAX_NO_CLAIM_FEE_WHITELIST_SIZE: usize = 100;