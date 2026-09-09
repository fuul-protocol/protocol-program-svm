import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { getConnection } from '../../../utils/connection';

export const printGlobalConfigCommand = new Command('print-global-config')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .action(async (options) => {
    const { network } = options;

    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const globalConfig = await sdk.getGlobalConfig();

    console.log('Global Config:');
    console.log(`  Paused: ${globalConfig.paused}`);
    console.log(`  Project Nonce: ${globalConfig.projectNonce}`);
    console.log(`  Claim Cool Down: ${globalConfig.claimCoolDown}`);
    console.log(`  Required Signers For Claim: ${globalConfig.requiredSignersForClaim}`);
    console.log(`  Is Initialized: ${globalConfig.isInitialized}`);

    console.log('\nGlobal Config Roles: ');
    for (const role of globalConfig.rolesMapping.roles) {
      console.log(`  ${role.account}: ${Object.keys(role.role)[0]}`);
    }

    console.log('\nGlobal Config Fee Management:');
    console.log(`  Fee Collector: ${globalConfig.feeManagement.feeCollector}`);
    console.log(`  User Native Claim Fee: ${globalConfig.feeManagement.userNativeClaimFee}`);
    console.log(`  Project Claim Fee: ${globalConfig.feeManagement.projectClaimFee}`);
    console.log(`  Remove Fee: ${globalConfig.feeManagement.removeFee}`);

    console.log('\nNo Claim Fee Whitelist:');
    for (const account of globalConfig.feeManagement.noClaimFeeWhitelist) {
      console.log(`  ${account}`);
    }
  });
