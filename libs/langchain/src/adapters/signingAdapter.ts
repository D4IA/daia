/**
 * Signing adapter for DAIA agreements using BSV private keys.
 * This adapter provides a simple interface for signing offers and
 * managing key exchange in agent conversations.
 */

import { PrivateKey, PublicKey } from "@bsv/sdk";
import {
  OfferSigner,
  type SigningResult,
  type DaiaOfferContent,
  BsvSignatureAdapter,
  type ISigningResourcesAdapter,
} from "@d4ia/proto";

/**
 * Simple implementation of ISigningResourcesAdapter using a single private key
 */
class SimpleSigningResourcesAdapter implements ISigningResourcesAdapter {
  constructor(private readonly privateKey: PrivateKey) {}

  async getPrivateKey(pubKey: string): Promise<PrivateKey | null> {
    // Check if the requested public key matches our private key's public key
    const ourPubKey = this.privateKey.toPublicKey().toString();
    if (pubKey === ourPubKey) {
      return this.privateKey;
    }
    return null;
  }

  async getCurrentTransactionId(): Promise<string | null> {
    // Not used for signature-only proofs
    return null;
  }
}

/**
 * Agent signing adapter - provides signing and key management functionality
 */
export class AgentSigningAdapter {
  private readonly privateKey: PrivateKey;
  private readonly publicKey: PublicKey;
  private readonly address: string;
  private readonly offerSigner: OfferSigner;

  constructor(privateKeyWif: string) {
    this.privateKey = PrivateKey.fromWif(privateKeyWif);
    this.publicKey = this.privateKey.toPublicKey();
    this.address = this.publicKey.toAddress();

    // Create the offer signer with adapters
    const signatureAdapter = new BsvSignatureAdapter(this.privateKey);
    const resourcesAdapter = new SimpleSigningResourcesAdapter(this.privateKey);
    this.offerSigner = new OfferSigner(signatureAdapter, resourcesAdapter);
  }

  /**
   * Get the public key as a hex string
   */
  getPublicKey(): string {
    return this.publicKey.toString();
  }

  /**
   * Get the address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Sign an offer and create proofs
   */
  async signOffer(offerContent: DaiaOfferContent): Promise<SigningResult> {
    return this.offerSigner.sign(offerContent);
  }
}
