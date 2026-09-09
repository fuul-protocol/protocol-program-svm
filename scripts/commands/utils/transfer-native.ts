import {
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { Command } from 'commander';
import readline from 'readline/promises';
import { loadWallet } from '../../utils/wallet';
import { getConnection } from '../../utils/connection';
import { buildExplorerUrl } from '../../utils/explorer';

const DECIMALS = 9;

const parseAmountToLamports = (amount: string): bigint => {
  if (!/^\d*\.?\d*$/.test(amount) || amount === '' || amount === '.') {
    throw new Error(`Invalid amount: ${amount}`);
  }

  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > DECIMALS) {
    throw new Error(`Amount cannot have more than ${DECIMALS} decimals: ${amount}`);
  }

  return (
    BigInt(whole || '0') * BigInt(LAMPORTS_PER_SOL) + BigInt(fraction.padEnd(DECIMALS, '0') || '0')
  );
};

const formatLamports = (lamports: number | bigint) =>
  (Number(lamports) / LAMPORTS_PER_SOL).toFixed(DECIMALS);

export const transferNativeCommand = new Command('transfer-native')
  .description('Transfer the native token (SOL / FOGO) from a keypair to another address')
  .requiredOption(
    '-n, --network <network>',
    'The network to use (localhost, devnet, testnet, mainnet-beta, fogo-testnet, fogo-mainnet)',
  )
  .requiredOption('-k, --keypair <keypair>', 'The path to the sender keypair')
  .requiredOption('--to <to>', 'The recipient address')
  .requiredOption('--amount <amount>', 'The amount to transfer, in whole tokens (e.g. 2 or 0.5)')
  .option('-y, --yes', 'Skip the confirmation prompt')
  .action(async (options) => {
    const { network, to, amount, yes } = options;

    const wallet = loadWallet(options.keypair);
    const connection = getConnection(network);

    const recipient = new PublicKey(to);
    const lamports = parseAmountToLamports(amount);
    const balance = await connection.getBalance(wallet.publicKey);

    if (BigInt(balance) <= lamports) {
      throw new Error(
        `Insufficient balance: ${formatLamports(balance)} available, ${formatLamports(
          lamports,
        )} requested (plus fees)`,
      );
    }

    console.log(`Network:   ${network}`);
    console.log(`From:      ${wallet.publicKey.toString()} (${formatLamports(balance)})`);
    console.log(`To:        ${recipient.toString()}`);
    console.log(`Amount:    ${formatLamports(lamports)}`);

    if (!yes) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question('Confirm transfer? (yes/no) ');
      rl.close();
      if (answer.trim().toLowerCase() !== 'yes') {
        console.log('Aborted.');
        return;
      }
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipient,
        lamports,
      }),
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [wallet.payer]);
    console.log(`Transaction sent: ${buildExplorerUrl(network, sig)}`);
  });
