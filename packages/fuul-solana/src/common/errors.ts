/**
 * Custom error class for Fuul Solana SDK.
 * Used to represent errors specific to the Fuul Solana SDK operations.
 */
export class FuulError extends Error {
  /**
   * Creates a new FuulError instance.
   *
   * @param message - The error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'FuulError';
  }
}
