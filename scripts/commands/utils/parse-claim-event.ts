import { FuulSdk } from '@fuul/sdk-solana';
import { Command } from 'commander';
import { getConnection } from '../../utils/connection';
import bs58 from 'bs58';
import { BN } from '@coral-xyz/anchor';

const formatEventData = (data: Record<string, unknown>): Record<string, unknown> => {
  const formatted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof BN || (typeof value === 'object' && value !== null && 'toString' in value && 'toNumber' in (value as Record<string, unknown>))) {
      formatted[key] = (value as BN).toString();
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'number')) {
      formatted[key] = bs58.encode(Buffer.from(value));
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
};

export const parseClaimEventCommand = new Command('parse-claim-event')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-t, --tx <tx>', 'The transaction signature to parse')
  .action(async (options) => {
    const { network, tx } = options;

    const connection = getConnection(network);
    const sdk = new FuulSdk(connection, network);

    const transaction = await connection.getTransaction(tx, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      console.error('Transaction not found');
      return;
    }

    if (!transaction.meta?.logMessages) {
      console.error('No logs found in transaction');
      return;
    }

    const events = sdk.parseTransactionLogs(transaction.meta.logMessages);

    if (events.length === 0) {
      console.log('No events found in transaction');
      return;
    }

    for (const event of events) {
      console.log(`Event: ${event.name}`);
      console.log('Data:', JSON.stringify(formatEventData(event.data as Record<string, unknown>), null, 2));
    }
  });
