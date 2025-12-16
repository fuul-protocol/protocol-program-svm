import { FuulSdk } from '@wakeuplabs/fuul-solana';
import { Command } from 'commander';
import { getConnection } from '../../utils/connection';
import { BN } from '@coral-xyz/anchor';

export const printProjectCommand = new Command('print-project')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('--project-nonce <project-nonce>', 'The project nonce')
  .action(async (options) => {
    const { network, projectNonce } = options;

    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const project = await sdk.getProject(new BN(projectNonce));
    console.log('Project:');
    console.log(`  Project Nonce: ${project.nonce}`);
    console.log(`  Is Initialized: ${project.isInitialized}`);

    console.log('\nProject Roles:');
    for (const role of project.rolesMapping.roles) {
      console.log(`  ${role.account}: ${Object.keys(role.role)[0]}`);
    }

    if (project.feeManagement) {
      console.log('\nProject Fee Management:');
      console.log(`  User Native Claim Fee: ${project.feeManagement.userNativeClaimFee}`);
      console.log(`  Project Claim Fee: ${project.feeManagement.projectClaimFee}`);
      console.log(`  Remove Fee: ${project.feeManagement.removeFee}`);
    }
  });
