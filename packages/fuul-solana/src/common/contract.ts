import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { Network } from '../types';

/**
 * Base SDK class for interacting with Anchor programs.
 * Provides common functionality for program interaction.
 *
 * @typeParam T - The IDL type of the program
 */
export class ContractSdk<T extends anchor.Idl> {
  private connection: Connection;
  private program: anchor.Program<T>;
  private network: Network;

  /**
   * Creates a new ContractSdk instance.
   *
   * @param connection - The Solana connection to the cluster
   * @param network - The network environment (mainnet, devnet, testnet, localhost)
   * @param idl - The IDL (Interface Definition Language) of the program
   */
  constructor(connection: Connection, network: Network, idl: anchor.Idl, programId?: PublicKey) {
    this.connection = connection;

    this.program = new anchor.Program(programId ? { ...idl, address: programId.toBase58() } : idl, {
      connection: this.connection,
    });

    this.network = network;
  }

  /**
   * Gets the Solana connection instance.
   *
   * @returns The Solana connection
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Gets the Anchor program instance.
   *
   * @returns The Anchor program instance
   */
  getProgram() {
    return this.program;
  }

  /**
   * Gets the program ID.
   *
   * @returns The program ID
   */
  getProgramId() {
    return this.program.programId;
  }

  /**
   * Gets the network environment.
   *
   * @returns The network environment (mainnet, devnet, testnet, localhost)
   */
  getNetwork() {
    return this.network;
  }

  /**
   * Parses the transaction logs for a specific event.
   *
   * @param logs - The transaction logs to parse
   * @returns The event data
   */
  parseTransactionLogs(logs: string[]): anchor.Event[] {
    const eventParser = new anchor.EventParser(this.program.programId, this.program.coder);

    const events = [];
    for (const log of eventParser.parseLogs(logs)) {
      events.push(log);
    }

    return events;
  }
}
