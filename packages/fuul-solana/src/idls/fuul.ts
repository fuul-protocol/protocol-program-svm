/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fuul_solana.json`.
 */
export type FuulIdl = {
  address: '7BLkgULKe2eMmrjqMZUSaX8iGsaStue9LgZTQuEpTBEg';
  metadata: {
    name: 'fuulSolana';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Fuul Solana Programs';
  };
  instructions: [
    {
      name: 'addCurrencyToken';
      docs: [
        'Add a new currency token to the global config',
        '',
        'Requirements:',
        '',
        '- Only admins can call this function.',
      ];
      discriminator: [200, 3, 244, 181, 140, 26, 171, 197];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
        {
          name: 'currencyToken';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'tokenMint';
          docs: [
            'It can also be the native token account and so we check token validity in the handler.',
          ];
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'tokenType';
          type: {
            defined: {
              name: 'tokenType';
            };
          };
        },
        {
          name: 'claimLimitPerCooldown';
          type: 'u64';
        },
      ];
    },
    {
      name: 'addNoClaimFeeWhitelist';
      docs: [
        'Add a wallet to the no claim fee whitelist',
        'Parameters:',
        '- account: The wallet to add to the no claim fee whitelist',
      ];
      discriminator: [200, 218, 236, 44, 206, 9, 145, 200];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'account';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'claim';
      docs: [
        'Claim a currency token from the project budget',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- `proof`: The proof of the claim (keccak hash of proof_without_project + project pubkey)',
        '- `proof_without_project`: The proof without project pubkey (used to verify proof)',
      ];
      discriminator: [62, 198, 214, 193, 213, 159, 108, 210];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'project';
          docs: ['The project to claim from.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
        {
          name: 'globalConfig';
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
        {
          name: 'tokenMint';
          docs: [
            'The mint of the token being distributed (can be default pubkey for native tokens)',
          ];
        },
        {
          name: 'feeCollector';
          writable: true;
        },
        {
          name: 'feeCollectorAta';
          docs: ['The fee collector account'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'feeCollector';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'currencyToken';
          docs: ['The currency token account'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'projectAta';
          docs: ['The token account owned by the project PDA (source of tokens)'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'recipient';
          docs: ["The recipient's public key"];
          writable: true;
        },
        {
          name: 'recipientAta';
          docs: ["The recipient's token account (destination of tokens)"];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'recipient';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'projectCurrencyBudget';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116,
                  45,
                  99,
                  117,
                  114,
                  114,
                  101,
                  110,
                  99,
                  121,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'account';
                path: 'currencyToken';
              },
            ];
          };
        },
        {
          name: 'projectAttribution';
          docs: [
            'Project attribution account, used to prevent replay attacks and simply record the attribution of the claim',
            'If this account already exists, the transaction will fail, preventing replay attacks',
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116,
                  45,
                  97,
                  116,
                  116,
                  114,
                  105,
                  98,
                  117,
                  116,
                  105,
                  111,
                  110,
                ];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'arg';
                path: 'proof';
              },
            ];
          };
        },
        {
          name: 'projectUser';
          docs: ["The user stats account, used to track the user's stats"];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116, 45, 117, 115, 101, 114];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'account';
                path: 'recipient';
              },
            ];
          };
        },
        {
          name: 'instructionSysvar';
          docs: ["The sysvar containing the full transaction's instructions"];
          address: 'Sysvar1nstructions1111111111111111111111111';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
        {
          name: 'associatedTokenProgram';
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'proof';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'proofWithoutProject';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'createGlobalConfig';
      docs: [
        'Create global config',
        'This is the first account that is created when the program is initialized.',
      ];
      discriminator: [47, 208, 62, 51, 32, 34, 119, 132];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [103, 108, 111, 98, 97, 108, 45, 99, 111, 110, 102, 105, 103];
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'feeCollector';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'createProject';
      docs: [
        'Creates a new Project',
        '',
        'Requirements:',
        '',
        '- `project_admin`: The admin of the project',
      ];
      discriminator: [148, 219, 181, 42, 221, 114, 145, 190];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
        {
          name: 'project';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'account';
                path: 'global_config.project_nonce';
                account: 'globalConfig';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'admin';
          type: 'pubkey';
        },
        {
          name: 'metadataUri';
          type: 'string';
        },
      ];
    },
    {
      name: 'depositFungibleToken';
      docs: [
        'Deposit a currency token into the project (Only admin can deposit)',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- `amount`: The amount of the currency token to deposit',
      ];
      discriminator: [22, 243, 236, 86, 36, 150, 55, 179];
      accounts: [
        {
          name: 'tokenMint';
        },
        {
          name: 'currencyToken';
          docs: ['The currency token to deposit.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'authority';
          docs: ['The authority to deposit from.'];
          writable: true;
          signer: true;
        },
        {
          name: 'authorityAta';
          docs: ['The authority token account to deposit from, only required for SPL tokens.'];
          writable: true;
          optional: true;
        },
        {
          name: 'project';
          docs: ['The project to deposit to.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
        {
          name: 'projectAta';
          docs: ['The project token account to deposit to.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'projectCurrencyBudget';
          docs: ['The project currency vault keeps track of the deposited balance'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116,
                  45,
                  99,
                  117,
                  114,
                  114,
                  101,
                  110,
                  99,
                  121,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'account';
                path: 'currencyToken';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'depositNonFungibleToken';
      docs: [
        'Deposit a single NFT into a project',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- The NFT must be owned by the authority',
        '- The project must have a token account for the NFT mint',
      ];
      discriminator: [42, 3, 22, 195, 201, 177, 11, 126];
      accounts: [
        {
          name: 'authority';
          docs: ['The authority to deposit from.'];
          writable: true;
          signer: true;
        },
        {
          name: 'authorityAta';
          docs: ['The authority token account to deposit from (the NFT source)'];
          writable: true;
        },
        {
          name: 'project';
          docs: ['The project to deposit to.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
        {
          name: 'projectAta';
          docs: ['The project token account to deposit to (the NFT destination)'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'tokenMint';
          docs: ['The NFT mint being transferred (must have 0 decimals)'];
        },
        {
          name: 'currencyToken';
          docs: ['The currency token to deposit.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'projectCurrencyBudget';
          docs: ['The project currency budget keeps track of the budget balance'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116,
                  45,
                  99,
                  117,
                  114,
                  114,
                  101,
                  110,
                  99,
                  121,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'account';
                path: 'currencyToken';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
      ];
    },
    {
      name: 'grantGlobalRole';
      docs: [
        'Grant a role to an account',
        'Parameters:',
        '- account: The account to grant the role to',
        '- role: The role to grant',
      ];
      discriminator: [211, 178, 177, 137, 155, 250, 155, 122];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'account';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: {
            defined: {
              name: 'globalRole';
            };
          };
        },
      ];
    },
    {
      name: 'grantProjectRole';
      docs: [
        'Grant a role to an account',
        'Parameters:',
        '- account: The account to grant the role to',
        '- role: The role to grant',
      ];
      discriminator: [17, 96, 54, 143, 115, 177, 202, 155];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'project';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'account';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: {
            defined: {
              name: 'projectRole';
            };
          };
        },
      ];
    },
    {
      name: 'pauseProgram';
      docs: [
        'Pause the program',
        'Sets the paused state of the global config to true.',
        'Only pausers can call this function.',
      ];
      discriminator: [91, 86, 253, 175, 66, 236, 172, 124];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [];
    },
    {
      name: 'removeCurrencyToken';
      docs: [
        'Remove a currency token from the global config',
        '',
        'Requirements:',
        '',
        '- Only admins can call this function.',
      ];
      discriminator: [115, 131, 60, 140, 194, 3, 209, 34];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
        {
          name: 'currencyToken';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [];
    },
    {
      name: 'removeFungibleToken';
      docs: [
        'Remove a currency token from the project (Only admin can remove)',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- `amount`: The amount of the currency token to remove',
      ];
      discriminator: [53, 164, 172, 131, 64, 14, 62, 51];
      accounts: [
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
        {
          name: 'tokenMint';
        },
        {
          name: 'feeCollector';
          docs: ['The fee collector account'];
          writable: true;
        },
        {
          name: 'protocolFeeCollectorAta';
          docs: ['The fee collector account'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'feeCollector';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'authority';
          docs: ['The authority that will receive the fee. Must be admin.'];
          writable: true;
          signer: true;
        },
        {
          name: 'authorityAta';
          docs: ['The authority token account to withdraw to, only required for SPL tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'authority';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'project';
          docs: ['The project to withdraw from.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
        {
          name: 'projectAta';
          docs: ['The project currency vault ata to withdraw from, only required for SPL tokens.'];
          writable: true;
          optional: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'currencyToken';
          docs: ['The currency token to withdraw.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'projectCurrencyBudget';
          docs: ['The project currency budget keeps track of the budget balance'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116,
                  45,
                  99,
                  117,
                  114,
                  114,
                  101,
                  110,
                  99,
                  121,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'account';
                path: 'currencyToken';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'removeNoClaimFeeWhitelist';
      docs: [
        'Remove a wallet from the no claim fee whitelist',
        'Parameters:',
        '- account: The wallet to remove from the no claim fee whitelist',
      ];
      discriminator: [102, 120, 193, 156, 126, 32, 239, 167];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'account';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'removeNonFungibleToken';
      docs: [
        'Remove a single NFT from the project (Only admin can remove)',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- The project must have the NFT',
      ];
      discriminator: [157, 179, 215, 98, 88, 34, 103, 138];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'authorityAta';
          docs: ['The authority token account to withdraw to (the NFT destination)'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'authority';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'project';
          docs: ['The project to withdraw from.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
        {
          name: 'projectAta';
          docs: ['The project token account to withdraw from (the NFT source)'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'const';
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
            program: {
              kind: 'const';
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ];
            };
          };
        },
        {
          name: 'tokenMint';
          docs: ['The NFT mint being transferred (must have 0 decimals)'];
        },
        {
          name: 'currencyToken';
          docs: ['The currency token to deposit.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'projectCurrencyBudget';
          docs: ['The project currency budget keeps track of the budget balance'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  112,
                  114,
                  111,
                  106,
                  101,
                  99,
                  116,
                  45,
                  99,
                  117,
                  114,
                  114,
                  101,
                  110,
                  99,
                  121,
                  45,
                  98,
                  117,
                  100,
                  103,
                  101,
                  116,
                ];
              },
              {
                kind: 'account';
                path: 'project';
              },
              {
                kind: 'account';
                path: 'currencyToken';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
        {
          name: 'tokenProgram';
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
      ];
    },
    {
      name: 'renounceGlobalRole';
      docs: ['Renounce a role', 'Parameters:', '- role: The role to renounce'];
      discriminator: [160, 86, 246, 206, 72, 125, 225, 148];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'role';
          type: {
            defined: {
              name: 'globalRole';
            };
          };
        },
      ];
    },
    {
      name: 'renounceProjectRole';
      docs: [
        'Renounce a role',
        'Parameters:',
        '- `project_nonce`: The nonce of the project',
        '- `role`: The role to renounce',
      ];
      discriminator: [113, 5, 99, 145, 220, 34, 84, 170];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'project';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'role';
          type: {
            defined: {
              name: 'projectRole';
            };
          };
        },
      ];
    },
    {
      name: 'revokeGlobalRole';
      docs: [
        'Revoke a role from an account',
        'Parameters:',
        '- account: The account to revoke the role from',
        '- role: The role to revoke',
      ];
      discriminator: [124, 96, 96, 85, 83, 43, 157, 28];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'account';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: {
            defined: {
              name: 'globalRole';
            };
          };
        },
      ];
    },
    {
      name: 'revokeProjectRole';
      docs: [
        'Revoke a role from an account',
        'Parameters:',
        '- account: The account to revoke the role from',
        '- role: The role to revoke',
      ];
      discriminator: [135, 238, 36, 13, 94, 43, 14, 36];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'project';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'account';
          type: 'pubkey';
        },
        {
          name: 'role';
          type: {
            defined: {
              name: 'projectRole';
            };
          };
        },
      ];
    },
    {
      name: 'unpauseProgram';
      docs: [
        'Unpause the program',
        'Sets the paused state of the global config to false.',
        'Only unpausers can call this function.',
      ];
      discriminator: [43, 162, 233, 92, 254, 62, 69, 58];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [];
    },
    {
      name: 'updateCurrencyTokenLimit';
      docs: [
        'Update the limit of a currency token',
        '',
        'Requirements:',
        '',
        '- Only admins can call this function.',
      ];
      discriminator: [20, 177, 169, 21, 128, 59, 186, 77];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
        {
          name: 'currencyToken';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [99, 117, 114, 114, 101, 110, 99, 121, 45, 116, 111, 107, 101, 110];
              },
              {
                kind: 'account';
                path: 'tokenMint';
              },
            ];
          };
        },
        {
          name: 'tokenMint';
        },
      ];
      args: [
        {
          name: 'claimLimitPerCooldown';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'isActive';
          type: {
            option: 'bool';
          };
        },
      ];
    },
    {
      name: 'updateGlobalConfig';
      docs: [
        'Update the global config',
        '',
        'Requirements:',
        '',
        '- `claim_cool_down` must be different from the current one.',
        '- `required_signers_for_claim` must be different from the current one.',
        '- Only admins can call this function.',
      ];
      discriminator: [164, 84, 130, 189, 111, 58, 250, 200];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'claimCoolDown';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'requiredSignersForClaim';
          type: {
            option: 'u8';
          };
        },
      ];
    },
    {
      name: 'updateGlobalConfigFees';
      docs: [
        'Update global config fee management fields at once.',
        '',
        'Requirements:',
        '',
        '- Any supplied field must be different from the current value.',
        '- Only admins can call this function.',
      ];
      discriminator: [162, 217, 12, 173, 175, 187, 167, 177];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'globalConfig';
          writable: true;
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'feeCollector';
          type: {
            option: 'pubkey';
          };
        },
        {
          name: 'userNativeClaimFee';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'projectClaimFee';
          type: {
            option: 'u16';
          };
        },
        {
          name: 'removeFee';
          type: {
            option: 'u16';
          };
        },
      ];
    },
    {
      name: 'updateProjectConfig';
      docs: [
        'Update the project config',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- `metadata_uri`: The new metadata URI',
      ];
      discriminator: [92, 158, 238, 143, 67, 224, 25, 155];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'project';
          docs: ['The project to update.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'metadataUri';
          type: 'string';
        },
      ];
    },
    {
      name: 'updateProjectFees';
      docs: [
        'Update the project fees',
        '',
        'Requirements:',
        '',
        '- `project_nonce`: The nonce of the project',
        '- `user_native_claim_fee`: The user native claim fee to update',
        '- `project_claim_fee`: The project claim fee to update',
        '- `remove_fee`: The remove fee to update',
        '- Only global config authorities can call this function.',
      ];
      discriminator: [69, 112, 48, 223, 112, 10, 201, 138];
      accounts: [
        {
          name: 'authority';
          writable: true;
          signer: true;
        },
        {
          name: 'project';
          docs: ['The project to update.'];
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [112, 114, 111, 106, 101, 99, 116];
              },
              {
                kind: 'arg';
                path: 'projectNonce';
              },
            ];
          };
        },
        {
          name: 'globalConfig';
          address: '6tmBxYUDkm8xg2NybDU5hgrpHLgs4gT1CPF1ngkQe9iY';
        },
      ];
      args: [
        {
          name: 'projectNonce';
          type: 'u64';
        },
        {
          name: 'userNativeClaimFee';
          type: {
            option: 'u64';
          };
        },
        {
          name: 'projectClaimFee';
          type: {
            option: 'u16';
          };
        },
        {
          name: 'removeFee';
          type: {
            option: 'u16';
          };
        },
      ];
    },
  ];
  accounts: [
    {
      name: 'currencyToken';
      discriminator: [194, 224, 161, 122, 190, 198, 83, 226];
    },
    {
      name: 'globalConfig';
      discriminator: [149, 8, 156, 202, 160, 252, 176, 217];
    },
    {
      name: 'project';
      discriminator: [205, 168, 189, 202, 181, 247, 142, 19];
    },
    {
      name: 'projectAttribution';
      discriminator: [28, 61, 129, 71, 75, 153, 174, 55];
    },
    {
      name: 'projectCurrencyBudget';
      discriminator: [12, 51, 66, 70, 121, 81, 118, 186];
    },
    {
      name: 'projectUser';
      discriminator: [227, 22, 255, 18, 216, 26, 126, 136];
    },
  ];
  events: [
    {
      name: 'logClaimedFromProjectBudgetEvent';
      discriminator: [231, 175, 26, 204, 81, 200, 86, 128];
    },
    {
      name: 'logCurrencyTokenAddedEvent';
      discriminator: [176, 171, 122, 63, 246, 215, 191, 83];
    },
    {
      name: 'logCurrencyTokenRemovedEvent';
      discriminator: [145, 126, 168, 174, 147, 43, 172, 202];
    },
    {
      name: 'logCurrencyTokenUpdatedEvent';
      discriminator: [238, 151, 206, 63, 5, 74, 179, 250];
    },
    {
      name: 'logFungibleTokenDepositedEvent';
      discriminator: [45, 4, 156, 137, 69, 10, 44, 202];
    },
    {
      name: 'logFungibleTokenRemovedEvent';
      discriminator: [217, 52, 179, 140, 110, 249, 100, 6];
    },
    {
      name: 'logGlobalConfigCreatedEvent';
      discriminator: [102, 200, 38, 66, 103, 139, 204, 214];
    },
    {
      name: 'logGlobalConfigFeesUpdatedEvent';
      discriminator: [92, 230, 138, 11, 56, 57, 22, 91];
    },
    {
      name: 'logGlobalConfigUpdatedEvent';
      discriminator: [145, 10, 87, 250, 22, 209, 82, 32];
    },
    {
      name: 'logGlobalRoleGrantedEvent';
      discriminator: [86, 182, 37, 9, 45, 129, 17, 27];
    },
    {
      name: 'logGlobalRoleRenouncedEvent';
      discriminator: [194, 51, 16, 25, 128, 117, 182, 16];
    },
    {
      name: 'logGlobalRoleRevokedEvent';
      discriminator: [211, 208, 223, 180, 192, 218, 224, 41];
    },
    {
      name: 'logNoClaimFeeWhitelistAddedEvent';
      discriminator: [2, 39, 58, 62, 250, 226, 195, 32];
    },
    {
      name: 'logNoClaimFeeWhitelistRemovedEvent';
      discriminator: [55, 108, 36, 151, 192, 236, 142, 47];
    },
    {
      name: 'logNonFungibleTokenDepositedEvent';
      discriminator: [163, 97, 157, 80, 91, 178, 127, 255];
    },
    {
      name: 'logNonFungibleTokenRemovedEvent';
      discriminator: [246, 114, 12, 253, 252, 43, 72, 166];
    },
    {
      name: 'logProgramPausedEvent';
      discriminator: [90, 113, 212, 192, 62, 133, 79, 24];
    },
    {
      name: 'logProgramUnpausedEvent';
      discriminator: [46, 215, 190, 137, 155, 130, 102, 233];
    },
    {
      name: 'logProjectConfigUpdatedEvent';
      discriminator: [12, 221, 46, 66, 131, 79, 234, 241];
    },
    {
      name: 'logProjectCreatedEvent';
      discriminator: [72, 235, 252, 79, 248, 207, 3, 151];
    },
    {
      name: 'logProjectFeesUpdatedEvent';
      discriminator: [5, 52, 60, 179, 35, 247, 195, 30];
    },
    {
      name: 'logProjectRoleGrantedEvent';
      discriminator: [201, 158, 179, 4, 163, 245, 198, 103];
    },
    {
      name: 'logProjectRoleRenouncedEvent';
      discriminator: [49, 247, 72, 132, 193, 197, 69, 121];
    },
    {
      name: 'logProjectRoleRevokedEvent';
      discriminator: [92, 221, 97, 255, 210, 94, 10, 105];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'unauthorized';
      msg: 'You are not authorized to perform this action.';
    },
    {
      code: 6001;
      name: 'invalidFeeCollector';
      msg: 'Invalid fee collector.';
    },
    {
      code: 6002;
      name: 'zeroValueNotAllowed';
      msg: 'Zero value not allowed.';
    },
    {
      code: 6003;
      name: 'programPaused';
      msg: 'Program is paused.';
    },
    {
      code: 6004;
      name: 'noNewChanges';
      msg: 'No new changes.';
    },
    {
      code: 6005;
      name: 'currencyTokenAlreadyAccepted';
      msg: 'Currency token already accepted.';
    },
    {
      code: 6006;
      name: 'currencyTokenNotAccepted';
      msg: 'Currency token not accepted.';
    },
    {
      code: 6007;
      name: 'invalidTokenType';
      msg: 'Invalid token type.';
    },
    {
      code: 6008;
      name: 'limitAlreadySet';
      msg: 'Limit already set.';
    },
    {
      code: 6009;
      name: 'invalidTokenMint';
      msg: 'Invalid token mint.';
    },
    {
      code: 6010;
      name: 'roleAlreadyExists';
      msg: 'Role already exists.';
    },
    {
      code: 6011;
      name: 'overflow';
      msg: 'Overflow.';
    },
    {
      code: 6012;
      name: 'underflow';
      msg: 'Underflow.';
    },
    {
      code: 6013;
      name: 'alreadyInitialized';
      msg: 'Already initialized.';
    },
    {
      code: 6014;
      name: 'cannotRevokeSelf';
      msg: 'Cannot revoke self.';
    },
    {
      code: 6015;
      name: 'cannotRenounceLastAdmin';
      msg: 'Cannot renounce last admin.';
    },
    {
      code: 6016;
      name: 'limitBelowCumulative';
      msg: 'Limit below cumulative.';
    },
    {
      code: 6017;
      name: 'nothingToUpdate';
      msg: 'Nothing to update.';
    },
    {
      code: 6018;
      name: 'invalidAccountData';
      msg: 'Invalid account data.';
    },
    {
      code: 6019;
      name: 'insufficientBalance';
      msg: 'Insufficient balance.';
    },
    {
      code: 6020;
      name: 'programIdMismatch';
      msg: 'Program ID mismatch.';
    },
    {
      code: 6021;
      name: 'versionMismatch';
      msg: 'Version mismatch.';
    },
    {
      code: 6022;
      name: 'deadlineExpired';
      msg: 'Deadline expired.';
    },
    {
      code: 6023;
      name: 'nonceMismatch';
      msg: 'Nonce mismatch.';
    },
    {
      code: 6024;
      name: 'invalidInstructionSysvar';
      msg: 'Invalid instruction sysvar.';
    },
    {
      code: 6025;
      name: 'badEd25519Program';
      msg: 'Bad Ed25519 program.';
    },
    {
      code: 6026;
      name: 'badEd25519Accounts';
      msg: 'Bad Ed25519 accounts.';
    },
    {
      code: 6027;
      name: 'invalidInstructionData';
      msg: 'Invalid instruction data.';
    },
    {
      code: 6028;
      name: 'notEnoughValidSigners';
      msg: 'Not enough valid signers.';
    },
    {
      code: 6029;
      name: 'invalidMessageDate';
      msg: 'Invalid message date.';
    },
    {
      code: 6030;
      name: 'signedMessageMismatch';
      msg: 'Signed message mismatch.';
    },
    {
      code: 6031;
      name: 'invalidClaimAmount';
      msg: 'Invalid token amount.';
    },
    {
      code: 6032;
      name: 'claimLimitExceeded';
      msg: 'Claim limit exceeded.';
    },
    {
      code: 6033;
      name: 'invalidAtaOwner';
      msg: 'Invalid ata owner.';
    },
    {
      code: 6034;
      name: 'missingAta';
      msg: 'Missing ata.';
    },
    {
      code: 6035;
      name: 'invalidPercentage';
      msg: 'Invalid percentage.';
    },
    {
      code: 6036;
      name: 'invalidProof';
      msg: 'Invalid proof.';
    },
    {
      code: 6037;
      name: 'alreadyInWhitelist';
      msg: 'Already in whitelist.';
    },
    {
      code: 6038;
      name: 'notInWhitelist';
      msg: 'Not in whitelist.';
    },
    {
      code: 6039;
      name: 'whitelistFull';
      msg: 'Whitelist full.';
    },
    {
      code: 6040;
      name: 'maxRolesReached';
      msg: 'Max roles reached.';
    },
    {
      code: 6041;
      name: 'insufficientFunds';
      msg: 'Insufficient funds.';
    },
    {
      code: 6042;
      name: 'roleDoesNotExist';
      msg: 'Account does not have the specified role.';
    },
  ];
  types: [
    {
      name: 'currencyToken';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isInitialized';
            docs: ['is_initialized flag'];
            type: 'bool';
          },
          {
            name: 'tokenMint';
            docs: ['Token mint'];
            type: 'pubkey';
          },
          {
            name: 'tokenType';
            docs: ['Token type'];
            type: {
              defined: {
                name: 'tokenType';
              };
            };
          },
          {
            name: 'isActive';
            docs: ['Is active'];
            type: 'bool';
          },
          {
            name: 'claimLimitPerCooldown';
            docs: ['Claim limit per cooldown'];
            type: 'u64';
          },
          {
            name: 'cumulativeClaimPerCooldown';
            docs: ['Cumulative claim per cooldown'];
            type: 'u64';
          },
          {
            name: 'claimCooldownPeriodStarted';
            docs: ['Claim cooldown period started'];
            type: 'i64';
          },
        ];
      };
    },
    {
      name: 'feeManagement';
      docs: ['Holds information about the different fees in the protocol'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'feeCollector';
            docs: ['Address that will collect protocol fees'];
            type: 'pubkey';
          },
          {
            name: 'noClaimFeeWhitelist';
            docs: ['Array of accounts that are exempt from paying claim fees'];
            type: {
              vec: 'pubkey';
            };
          },
          {
            name: 'userNativeClaimFee';
            docs: ['Fixed fee in native tokens paid by users per claim'];
            type: 'u64';
          },
          {
            name: 'projectClaimFee';
            docs: ['Fee paid by the project upon user claim. In basis points.'];
            type: 'u16';
          },
          {
            name: 'removeFee';
            docs: [
              'Rescue fee applied when unclaimed funds are rescued by project admin. In basis points.',
            ];
            type: 'u16';
          },
        ];
      };
    },
    {
      name: 'globalConfig';
      docs: [
        'Global config',
        'This is the first account that is created when the program is initialized.',
        'It contains the configuration for the protocol.',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isInitialized';
            docs: ['is_initialized flag'];
            type: 'bool';
          },
          {
            name: 'paused';
            docs: ['Paused state'];
            type: 'bool';
          },
          {
            name: 'projectNonce';
            docs: ['Nonce for projects'];
            type: 'u64';
          },
          {
            name: 'claimCoolDown';
            docs: [
              'Amount of time that must elapse after {claimCooldownPeriodStarted} for the cumulative amount to be restarted',
            ];
            type: 'u64';
          },
          {
            name: 'requiredSignersForClaim';
            docs: ['Number of required signers for a claim'];
            type: 'u8';
          },
          {
            name: 'feeManagement';
            docs: ['Fee management'];
            type: {
              defined: {
                name: 'feeManagement';
              };
            };
          },
          {
            name: 'rolesMapping';
            docs: ['Roles mapping'];
            type: {
              defined: {
                name: 'globalRolesMapping';
              };
            };
          },
        ];
      };
    },
    {
      name: 'globalRole';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'admin';
          },
          {
            name: 'pauser';
          },
          {
            name: 'unpauser';
          },
          {
            name: 'signer';
          },
        ];
      };
    },
    {
      name: 'globalRoleEntry';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'globalRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'globalRolesMapping';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'roles';
            type: {
              vec: {
                defined: {
                  name: 'globalRoleEntry';
                };
              };
            };
          },
        ];
      };
    },
    {
      name: 'logClaimedFromProjectBudgetEvent';
      docs: [
        'Log the claim of a currency token from the project budget',
        'Parameters:',
        '- `project`: The project that claimed the currency token',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'amount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'logCurrencyTokenAddedEvent';
      docs: [
        'Log the addition of a new currency token',
        'Parameters:',
        '- token_mint: The mint of the new currency token',
        '- token_type: The type of the new currency token',
        '- claim_limit_per_cooldown: The limit of the new currency token',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tokenMint';
            type: 'pubkey';
          },
          {
            name: 'tokenType';
            type: {
              defined: {
                name: 'tokenType';
              };
            };
          },
          {
            name: 'claimLimitPerCooldown';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'logCurrencyTokenRemovedEvent';
      docs: [
        'Log the removal of a currency token',
        'Parameters:',
        '- token_mint: The mint of the currency token',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tokenMint';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logCurrencyTokenUpdatedEvent';
      docs: [
        'Log the update of the currency token limit',
        'Parameters:',
        '- token_mint: The mint of the currency token',
        '- claim_limit_per_cooldown: The new limit of the currency token',
        '- is_active: The new active status of the currency token',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'tokenMint';
            type: 'pubkey';
          },
          {
            name: 'claimLimitPerCooldown';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'isActive';
            type: {
              option: 'bool';
            };
          },
        ];
      };
    },
    {
      name: 'logFungibleTokenDepositedEvent';
      docs: [
        'Log the deposit of a fungible token into a project',
        'Parameters:',
        '- `project`: The project that deposited the fungible token',
        '- `currency_token`: The currency token that was deposited',
        '- `amount`: The amount of the fungible token that was deposited',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'currencyToken';
            type: 'pubkey';
          },
          {
            name: 'amount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'logFungibleTokenRemovedEvent';
      docs: [
        'Log the removal of a currency token from the project',
        'Parameters:',
        '- project: The project that removed the currency token',
        '- currency_token: The currency token that was removed',
        '- amount: The amount of the currency token that was removed',
        '- fee: The fee that was removed',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'currencyToken';
            type: 'pubkey';
          },
          {
            name: 'amount';
            type: 'u64';
          },
          {
            name: 'fee';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'logGlobalConfigCreatedEvent';
      docs: ['Log the creation of the global config'];
      type: {
        kind: 'struct';
        fields: [];
      };
    },
    {
      name: 'logGlobalConfigFeesUpdatedEvent';
      docs: [
        'Log the update of all fees with the new values',
        '',
        'Parameters:',
        '- fee_collector: The new fee collector',
        '- user_native_claim_fee: The new user native claim fee',
        '- project_claim_fee: The new project claim fee',
        '- remove_fee: The new remove fee',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'feeCollector';
            type: {
              option: 'pubkey';
            };
          },
          {
            name: 'userNativeClaimFee';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'projectClaimFee';
            type: {
              option: 'u16';
            };
          },
          {
            name: 'removeFee';
            type: {
              option: 'u16';
            };
          },
        ];
      };
    },
    {
      name: 'logGlobalConfigUpdatedEvent';
      docs: [
        'Log the update of the global config',
        'Parameters:',
        '- claim_cool_down: The new claim cool down',
        '- required_signers_for_claim: The new required signers for claim',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'claimCoolDown';
            type: 'u64';
          },
          {
            name: 'requiredSignersForClaim';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'logGlobalRoleGrantedEvent';
      docs: [
        'Log the grant of a role',
        'Parameters:',
        '- account: The account that was granted the role',
        '- role: The role that was granted',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'globalRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'logGlobalRoleRenouncedEvent';
      docs: [
        'Log the renouncement of a role',
        'Parameters:',
        '- account: The account that was renounced the role',
        '- role: The role that was renounced',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'globalRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'logGlobalRoleRevokedEvent';
      docs: [
        'Log the revocation of a role',
        'Parameters:',
        '- account: The account that was revoked the role',
        '- role: The role that was revoked',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'globalRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'logNoClaimFeeWhitelistAddedEvent';
      docs: [
        'Log the addition of a wallet to the no claim fee whitelist',
        'Parameters:',
        '- account: The wallet that was added to the no claim fee whitelist',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logNoClaimFeeWhitelistRemovedEvent';
      docs: [
        'Log the removal of a wallet from the no claim fee whitelist',
        'Parameters:',
        '- account: The wallet that was removed from the no claim fee whitelist',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logNonFungibleTokenDepositedEvent';
      docs: [
        'Log the deposit of an NFT into a project',
        'Parameters:',
        '- `project`: The project that received the NFT',
        '- `authority`: The authority that deposited the NFT',
        '- `nft_mint`: The NFT mint that was deposited',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'authority';
            type: 'pubkey';
          },
          {
            name: 'nonFungibleTokenMint';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logNonFungibleTokenRemovedEvent';
      docs: [
        'Log the removal of an NFT from a project',
        'Parameters:',
        '- `project`: The project that removed the NFT',
        '- `authority`: The authority that withdrew the NFT',
        '- `nft_mint`: The NFT mint that was removed',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'authority';
            type: 'pubkey';
          },
          {
            name: 'nonFungibleTokenMint';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logProgramPausedEvent';
      docs: [
        'Log the update of the paused state',
        'Parameters:',
        '- paused_by: The account that paused the program',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pausedBy';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logProgramUnpausedEvent';
      docs: [
        'Log the update of the paused state',
        'Parameters:',
        '- unpaused_by: The account that unpaused the program',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'unpausedBy';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'logProjectConfigUpdatedEvent';
      docs: [
        'Log the update of the project config',
        'Parameters:',
        '- `project`: The project that was updated',
        '- `metadata_uri`: The new metadata URI',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'metadataUri';
            type: {
              option: 'string';
            };
          },
        ];
      };
    },
    {
      name: 'logProjectCreatedEvent';
      docs: [
        'Log the creation of the project',
        'Parameters:',
        '- `admin`: The admin of the project',
        '- `project_nonce`: The nonce of the created project',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'metadataUri';
            type: 'string';
          },
          {
            name: 'projectNonce';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'logProjectFeesUpdatedEvent';
      docs: [
        'Log the update of the project fees',
        'Parameters:',
        '- `project`: The project that was updated',
        '- `user_native_claim_fee`: The new user native claim fee',
        '- `project_claim_fee`: The new project claim fee',
        '- `remove_fee`: The new remove fee',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'project';
            type: 'pubkey';
          },
          {
            name: 'userNativeClaimFee';
            type: {
              option: 'u64';
            };
          },
          {
            name: 'projectClaimFee';
            type: {
              option: 'u16';
            };
          },
          {
            name: 'removeFee';
            type: {
              option: 'u16';
            };
          },
        ];
      };
    },
    {
      name: 'logProjectRoleGrantedEvent';
      docs: [
        'Log the grant of a role',
        'Parameters:',
        '- account: The account that was granted the role',
        '- role: The role that was granted',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'projectRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'logProjectRoleRenouncedEvent';
      docs: [
        'Log the renouncement of a role',
        'Parameters:',
        '- account: The account that was renounced the role',
        '- role: The role that was renounced',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'projectRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'logProjectRoleRevokedEvent';
      docs: [
        'Log the revocation of a role',
        'Parameters:',
        '- account: The account that was revoked the role',
        '- role: The role that was revoked',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'projectRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'project';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'isInitialized';
            docs: ['initialized flag'];
            type: 'bool';
          },
          {
            name: 'nonce';
            docs: ['Nonce for the project'];
            type: 'u64';
          },
          {
            name: 'attributionsCount';
            docs: ['Attributions count'];
            type: 'u64';
          },
          {
            name: 'metadataUri';
            docs: ['Metadata URI'];
            type: 'string';
          },
          {
            name: 'feeManagement';
            docs: ['Fee management, each project can have overwrites over the global config fees'];
            type: {
              defined: {
                name: 'projectFeeManagement';
              };
            };
          },
          {
            name: 'rolesMapping';
            docs: ['Roles mapping'];
            type: {
              defined: {
                name: 'projectRolesMapping';
              };
            };
          },
        ];
      };
    },
    {
      name: 'projectAttribution';
      docs: ['Nullifier account to track used nonces and prevent signature replay attacks'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'nonce';
            docs: ['Nonce of the attribution'];
            type: 'u64';
          },
          {
            name: 'tokenMint';
            docs: ['Token mint of the claim'];
            type: 'pubkey';
          },
          {
            name: 'amount';
            docs: ['Amount of the claim'];
            type: 'u64';
          },
          {
            name: 'recipient';
            docs: ['Recipient of the claim'];
            type: 'pubkey';
          },
          {
            name: 'proof';
            docs: ['Proof of the claim'];
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'timestamp';
            docs: ['Timestamp of the claim'];
            type: 'i64';
          },
        ];
      };
    },
    {
      name: 'projectCurrencyBudget';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'budget';
            docs: ['Project currency budget'];
            type: 'u64';
          },
          {
            name: 'tokenMint';
            docs: ['Project currency token'];
            type: 'pubkey';
          },
          {
            name: 'tokenAccount';
            docs: ['Project currency token account'];
            type: {
              option: 'pubkey';
            };
          },
        ];
      };
    },
    {
      name: 'projectFeeManagement';
      docs: ['Holds information about the different fees in the protocol'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'userNativeClaimFee';
            docs: ['Native claim fee in lamports. User should pay for this.'];
            type: {
              option: 'u64';
            };
          },
          {
            name: 'projectClaimFee';
            docs: ['Project claim fee in basis points. Project will pay for this.'];
            type: {
              option: 'u16';
            };
          },
          {
            name: 'removeFee';
            docs: [
              'Remove fee in basis points applied when unclaimed funds are removed by project admin.',
            ];
            type: {
              option: 'u16';
            };
          },
        ];
      };
    },
    {
      name: 'projectRole';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'admin';
          },
        ];
      };
    },
    {
      name: 'projectRoleEntry';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'account';
            type: 'pubkey';
          },
          {
            name: 'role';
            type: {
              defined: {
                name: 'projectRole';
              };
            };
          },
        ];
      };
    },
    {
      name: 'projectRolesMapping';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'roles';
            type: {
              vec: {
                defined: {
                  name: 'projectRoleEntry';
                };
              };
            };
          },
        ];
      };
    },
    {
      name: 'projectUser';
      docs: ['Project user account to track user stats'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'authority';
            docs: ['User the user is associated with'];
            type: 'pubkey';
          },
          {
            name: 'project';
            docs: ['Project the user is associated with'];
            type: 'pubkey';
          },
          {
            name: 'totalClaims';
            docs: ['Total claims made by the user'];
            type: 'u64';
          },
          {
            name: 'totalNativeClaimed';
            docs: ['Total native tokens claimed by the user'];
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'tokenType';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'native';
          },
          {
            name: 'fungibleSpl';
          },
          {
            name: 'nonFungibleSpl';
          },
        ];
      };
    },
  ];
};
