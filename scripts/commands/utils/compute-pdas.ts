import { FUUL_PROGRAM_IDL, getGlobalConfigPda, Network } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';

export const computePdasCommand = new Command('compute-pdas')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .option('--program-id <program-id>', 'The program id to use')
  .action(async (options) => {
    const { network, programId: programIdOption } = options;
    const programId = programIdOption
      ? new PublicKey(programIdOption)
      : new PublicKey(FUUL_PROGRAM_IDL[network as Network].address);

    const globalConfigPda = await getGlobalConfigPda(programId);
    console.log(`GLOBAL CONFIG PDA: ${globalConfigPda[0].toString()}`);
    console.log(`GLOBAL CONFIG BUMP: ${globalConfigPda[1]}`);
  });
