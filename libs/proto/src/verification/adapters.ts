import { PublicKey, PrivateKey, Signature } from "@bsv/sdk";

/**
 * Payment verification result from blockchain.
 */
export interface PaymentVerification {
  exists: boolean;
  recipient: string;
  amount: number;
  isConfirmed: boolean;
}

/**
 * Adapter for blockchain operations.
 * Allows for mocking blockchain interactions in tests.
 */
export interface IBlockchainAdapter {
  /**
   * Verify a payment transaction.
   * @param txId - Transaction ID to verify
   * @returns Payment verification result
   */
  verifyPayment(txId: string): Promise<PaymentVerification>;
}

/**
 * Adapter for signature verification operations.
 * Works with a set of public keys for verification.
 */
export interface ISignatureVerifier {
  /**
   * Verify a signature against any of the registered public keys.
   * @param message - Original message
   * @param signature - Signature to verify
   * @param publicKey - Public key to verify against
   * @returns True if signature is valid
   */
  verify(message: string, signature: Signature, publicKey: PublicKey): boolean;

  /**
   * Convert public key string to PublicKey instance.
   * @param pubKeyStr - Public key string (hex)
   */
  publicKeyFromString(pubKeyStr: string): PublicKey;

  /**
   * Convert signature string to Signature instance.
   * @param sigStr - Signature string (DER hex)
   */
  signatureFromString(sigStr: string): Signature;
}

/**
 * Adapter for signature creation operations.
 * Works with a set of private keys for signing.
 */
export interface ISignatureSigner {
  /**
   * Sign a message with the private key corresponding to the given public key.
   * @param message - Message to sign (combined offerContent + nonces)
   * @param publicKey - Public key identifying which private key to use
   * @returns Signature or null if private key not found
   */
  sign(message: string, publicKey: PublicKey): Promise<Signature | null>;

  /**
   * Check if a private key is available for the given public key.
   * @param publicKey - Public key to check
   * @returns True if private key is available
   */
  hasPrivateKey(publicKey: PublicKey): boolean;

  /**
   * Convert public key string to PublicKey instance.
   * @param pubKeyStr - Public key string (hex)
   */
  publicKeyFromString(pubKeyStr: string): PublicKey;
}

/**
 * Resources needed for creating proofs.
 */
export interface ISigningResourcesAdapter {
  /**
   * Get the private key for signing.
   * @param pubKey - The public key associated with the requirement
   * @returns Private key if available
   */
  getPrivateKey(pubKey: string): Promise<PrivateKey | null>;

  /**
   * Get current blockchain transaction ID if payment is in current tx.
   * @returns Transaction ID or null if not in current transaction
   */
  getCurrentTransactionId(): Promise<string | null>;
}
