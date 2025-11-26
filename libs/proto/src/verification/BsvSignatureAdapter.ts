import { PrivateKey, PublicKey, Signature } from "@bsv/sdk";
import type { ISignatureVerifier, ISignatureSigner } from "./adapters";

/**
 * BSV SDK implementation of ISignatureVerifier.
 * Verifies signatures using the @bsv/sdk library.
 */
export class BsvSignatureVerifier implements ISignatureVerifier {
  verify(message: string, signature: Signature, publicKey: PublicKey): boolean {
    const encoder = new TextEncoder();
    const messageBytes = Array.from(encoder.encode(message));
    return publicKey.verify(messageBytes, signature);
  }

  publicKeyFromString(pubKeyStr: string): PublicKey {
    return PublicKey.fromString(pubKeyStr);
  }

  signatureFromString(sigStr: string): Signature {
    return Signature.fromDER(sigStr, "hex");
  }
}

/**
 * BSV SDK implementation of ISignatureSigner.
 * Signs messages using a set of private keys.
 */
export class BsvSignatureSigner implements ISignatureSigner {
  private readonly keyMap: Map<string, PrivateKey>;

  /**
   * @param privateKeys - Set of private keys available for signing
   */
  constructor(privateKeys: PrivateKey[]) {
    this.keyMap = new Map();
    for (const privateKey of privateKeys) {
      const publicKeyHex = privateKey.toPublicKey().toString();
      this.keyMap.set(publicKeyHex, privateKey);
    }
  }

  async sign(message: string, publicKey: PublicKey): Promise<Signature | null> {
    const publicKeyHex = publicKey.toString();
    const privateKey = this.keyMap.get(publicKeyHex);
    
    if (!privateKey) {
      return null;
    }

    const encoder = new TextEncoder();
    const messageBytes = Array.from(encoder.encode(message));
    return privateKey.sign(messageBytes);
  }

  hasPrivateKey(publicKey: PublicKey): boolean {
    const publicKeyHex = publicKey.toString();
    return this.keyMap.has(publicKeyHex);
  }

  publicKeyFromString(pubKeyStr: string): PublicKey {
    return PublicKey.fromString(pubKeyStr);
  }
}

/**
 * Legacy adapter for backward compatibility.
 * @deprecated Use BsvSignatureVerifier and BsvSignatureSigner instead
 */
export class BsvSignatureAdapter {
  private readonly verifier: BsvSignatureVerifier;
  private readonly signer: BsvSignatureSigner;

  constructor(privateKey: PrivateKey) {
    this.verifier = new BsvSignatureVerifier();
    this.signer = new BsvSignatureSigner([privateKey]);
  }

  verify(message: string, signature: Signature, publicKey: PublicKey): boolean {
    return this.verifier.verify(message, signature, publicKey);
  }

  async sign(message: string, publicKey: PublicKey): Promise<Signature | null> {
    return this.signer.sign(message, publicKey);
  }

  publicKeyFromString(pubKeyStr: string): PublicKey {
    return this.verifier.publicKeyFromString(pubKeyStr);
  }

  signatureFromString(sigStr: string): Signature {
    return this.verifier.signatureFromString(sigStr);
  }

  hasPrivateKey(publicKey: PublicKey): boolean {
    return this.signer.hasPrivateKey(publicKey);
  }
}
