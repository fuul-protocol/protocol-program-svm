import 'dotenv/config';
import { Command } from 'commander';
import { computePdasCommand } from './commands/utils/compute-pdas';
import { parseClaimEventCommand } from './commands/utils/parse-claim-event';
import { transferNativeCommand } from './commands/utils/transfer-native';
import { removeCurrencyTokenCommand } from './commands/admin/currency-token/remove';
import { createGlobalConfigCommand } from './commands/admin/config/create';
import { updateGlobalConfigCommand } from './commands/admin/config/update';
import { updateGlobalConfigFeesCommand } from './commands/admin/config/update-fees';
import { pauseProgramCommand } from './commands/admin/control/pause';
import { unpauseProgramCommand } from './commands/admin/control/unpause';
import { addCurrencyTokenCommand } from './commands/admin/currency-token/add';
import { updateCurrencyToken } from './commands/admin/currency-token/update';
import { updateProjectFeesCommand } from './commands/project/update-fees';
import { grantGlobalRoleCommand } from './commands/admin/roles/grant';
import { revokeGlobalRoleCommand } from './commands/admin/roles/revoke';
import { renounceGlobalRoleCommand } from './commands/admin/roles/renounce';
import { createProjectCommand } from './commands/project/create';
import { grantProjectRoleCommand } from './commands/project/roles/grant';
import { revokeProjectRoleCommand } from './commands/project/roles/revoke';
import { renounceProjectRoleCommand } from './commands/project/roles/renounce';
import { depositFungibleTokenCommand } from './commands/project/budget/deposit-fungible-token';
import { removeFungibleTokenCommand } from './commands/project/budget/remove-fungible-token';
import { removeNonFungibleTokenCommand } from './commands/project/budget/remove-non-fungible-token';
import { depositNonFungibleTokenCommand } from './commands/project/budget/deposit-non-fungible-token';
import { printGlobalConfigCommand } from './commands/admin/config/print';
import { printCurrencyTokenCommand } from './commands/admin/currency-token/print';
import { createClaimVoucherCommand } from './commands/project/budget/create-claim-voucher';
import { printProjectCurrencyBudgetCommand } from './commands/project/budget/print';
import { printProjectCommand } from './commands/project/print';
import { claimProjectCurrencyBudgetCommand } from './commands/project/budget/claim';
import { testBatchClaimCommand } from './commands/project/budget/test-batch-claim';
import { addNoClaimFeeWhitelistCommand } from './commands/admin/whitelist/add';
import { removeNoClaimFeeWhitelistCommand } from './commands/admin/whitelist/remove';

const program = new Command();
program.name('fuul').description('Fuul Solana CLI').version('1.0.0');

// admin global config commands
program
  .addCommand(createGlobalConfigCommand)
  .addCommand(updateGlobalConfigCommand)
  .addCommand(updateGlobalConfigFeesCommand)
  .addCommand(printGlobalConfigCommand);

// admin control commands
program.addCommand(pauseProgramCommand);
program.addCommand(unpauseProgramCommand);

// admin role commands
program.addCommand(grantGlobalRoleCommand);
program.addCommand(revokeGlobalRoleCommand);
program.addCommand(renounceGlobalRoleCommand);

// admin whitelist commands
program.addCommand(addNoClaimFeeWhitelistCommand);
program.addCommand(removeNoClaimFeeWhitelistCommand);

// admin currency token commands
program.addCommand(addCurrencyTokenCommand);
program.addCommand(updateCurrencyToken);
program.addCommand(removeCurrencyTokenCommand);
program.addCommand(printCurrencyTokenCommand);

// project commands
program.addCommand(createProjectCommand);
program.addCommand(updateProjectFeesCommand);
program.addCommand(printProjectCommand);

// project role commands
program.addCommand(grantProjectRoleCommand);
program.addCommand(revokeProjectRoleCommand);
program.addCommand(renounceProjectRoleCommand);

// project budget commands
program.addCommand(depositFungibleTokenCommand);
program.addCommand(removeFungibleTokenCommand);
program.addCommand(removeNonFungibleTokenCommand);
program.addCommand(depositNonFungibleTokenCommand);
program.addCommand(createClaimVoucherCommand);
program.addCommand(printProjectCurrencyBudgetCommand);
program.addCommand(claimProjectCurrencyBudgetCommand);
program.addCommand(testBatchClaimCommand);

// utils commands
program.addCommand(computePdasCommand);
program.addCommand(parseClaimEventCommand);
program.addCommand(transferNativeCommand);

program.parse();
