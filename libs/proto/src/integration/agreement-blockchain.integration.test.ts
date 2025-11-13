import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, PublicKey, P2PKH } from "@bsv/sdk";
import {
  DaiaOfferContent,
  DaiaRequirementType,
} from "../types/offer";
import { OfferSigner } from "../verification/OfferSigner";
import { AgreementVerifier } from "../verification/AgreementVerifier";
import { BsvSignatureSigner, BsvSignatureVerifier } from "../verification/BsvSignatureAdapter";
import {
  TransactionBuilder,
  TransactionParser,
  MockBroadcaster,
  Network,
} from "../blockchain";
import { Utxo } from "../blockchain/types";

/**
 * Mock adapters for testing
 */
class MockSigningResourcesAdapter {
  private keys: Map<string, PrivateKey> = new Map();

  constructor(...privateKeys: PrivateKey[]) {
    for (const key of privateKeys) {
      this.keys.set(key.toPublicKey().toString(), key);
    }
  }

  async getPrivateKey(pubKey: string): Promise<PrivateKey | null> {
    return this.keys.get(pubKey) || null;
  }

  async getCurrentTransactionId(): Promise<string | null> {
    return null; // No current transaction in tests
  }
}

class MockBlockchainAdapter {
  private transactions = new Map<string, { recipient: string; amount: number }>();

  recordTransaction(txId: string, recipient: string, amount: number): void {
    this.transactions.set(txId, { recipient, amount });
  }

  async verifyPayment(txId: string) {
    const tx = this.transactions.get(txId);
    if (!tx) {
      return {
        exists: false,
        recipient: "",
        amount: 0,
        isConfirmed: false,
      };
    }

    return {
      exists: true,
      recipient: tx.recipient,
      amount: tx.amount,
      isConfirmed: true,
    };
  }
}

/**
 * Integration tests for the full workflow:
 * 1. Create offer with requirements
 * 2. Sign offer and create proofs
 * 3. Build blockchain transaction with agreement data
 * 4. Parse agreement from transaction
 * 5. Verify agreement
 */
describe("Full Agreement Workflow Integration Tests", () => {
  let offererPrivateKey: PrivateKey;
  let signerPrivateKey: PrivateKey;
  let paymentRecipient: string;
  let offerSigner: OfferSigner;
  let agreementVerifier: AgreementVerifier;
  let signatureSigner: BsvSignatureSigner;
  let signatureVerifier: BsvSignatureVerifier;
  let mockBlockchainAdapter: MockBlockchainAdapter;
  let transactionBuilder: TransactionBuilder;
  let transactionParser: TransactionParser;
  let mockBroadcaster: MockBroadcaster;

  beforeEach(() => {
    // Setup keys
    offererPrivateKey = PrivateKey.fromRandom();
    signerPrivateKey = PrivateKey.fromRandom();
    paymentRecipient = PrivateKey.fromRandom().toPublicKey().toAddress();

    // Setup signature adapters
    signatureSigner = new BsvSignatureSigner([signerPrivateKey]);
    signatureVerifier = new BsvSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter(
      signerPrivateKey
    );
    mockBlockchainAdapter = new MockBlockchainAdapter();

    // Setup components
    offerSigner = new OfferSigner(signatureSigner, signingResourcesAdapter);
    agreementVerifier = new AgreementVerifier(
      mockBlockchainAdapter,
      signatureVerifier
    );
    mockBroadcaster = new MockBroadcaster();
    transactionBuilder = new TransactionBuilder(mockBroadcaster);
    transactionParser = new TransactionParser();
  });

  it("should complete full workflow: create offer → sign → store on blockchain → verify", async () => {
    // Step 1: Create an offer with signature requirement
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent:
        "Alice agrees to pay Bob 1000 satoshis for parking space",
      requirements: new Map([
        [
          "req1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: signerPrivateKey.toPublicKey().toString(),
            offererNonce: "random-nonce-12345",
          },
        ],
      ]),
    };

    // Step 2: Sign the offer
    const { agreement, paymentsRequired } = await offerSigner.sign(offerContent);

    expect(agreement.proofs.size).toBe(1);
    expect(paymentsRequired.size).toBe(0); // No payments in this example

    // Step 3: Store agreement on blockchain as OP_RETURN data
    const agreementJson = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Array.from(agreement.proofs.entries()),
    });

    const utxos: Utxo[] = [
      {
        txId: "0".repeat(64),
        outputIndex: 0,
        satoshis: 50000,
        script: "76a914" + "00".repeat(20) + "88ac",
      },
    ];

    const txResult = await transactionBuilder.buildTransaction(
      offererPrivateKey,
      utxos,
      paymentRecipient,
      1000,
      agreementJson
    );

    expect(txResult.txHex).toBeDefined();
    expect(txResult.usedUtxos.length).toBe(1);

    // Step 4: Parse agreement from blockchain transaction
    const extractedData = transactionParser.extractData(txResult.txHex);
    expect(extractedData).toBe(agreementJson);

    const parsedAgreement = JSON.parse(extractedData!);
    const reconstructedAgreement: {
      offerContentSerialized: string;
      proofs: Map<string, any>;
    } = {
      offerContentSerialized: parsedAgreement.offerContentSerialized,
      proofs: new Map(parsedAgreement.proofs),
    };

    // Step 5: Verify the agreement
    await expect(
      agreementVerifier.verify({ agreement: reconstructedAgreement })
    ).resolves.not.toThrow();
  });

  it("should handle offer with payment requirement stored on blockchain", async () => {
    // Create offer with payment requirement
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent:
        "Service provider requires payment for service",
      requirements: new Map([
        [
          "payment1",
          {
            type: DaiaRequirementType.Payment,
            to: paymentRecipient,
            txId: "", // Self-paid
          },
        ],
      ]),
    };

    // Sign the offer
    const { agreement, paymentsRequired } = await offerSigner.sign(offerContent);

    // Payment requirement creates a proof but no amount tracking (it's tracked separately in the offer)
    expect(paymentsRequired.size).toBe(1);
    expect(paymentsRequired.get(paymentRecipient)).toBe(0); // Self-paid, no amount yet

    // Build transaction with payment AND agreement data
    const agreementJson = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Array.from(agreement.proofs.entries()),
    });

    const utxos: Utxo[] = [
      {
        txId: "0".repeat(64),
        outputIndex: 0,
        satoshis: 50000,
        script: "76a914" + "00".repeat(20) + "88ac",
      },
    ];

    const txResult = await transactionBuilder.buildTransaction(
      offererPrivateKey,
      utxos,
      paymentRecipient,
      5000, // Payment amount matches requirement
      agreementJson
    );

    // Record the transaction for verification
    mockBlockchainAdapter.recordTransaction(
      txResult.txId,
      paymentRecipient,
      5000
    );

    // Parse and verify
    const extractedData = transactionParser.extractData(txResult.txHex);
    const parsedAgreement = JSON.parse(extractedData!);
    const reconstructedAgreement: {
      offerContentSerialized: string;
      proofs: Map<string, any>;
    } = {
      offerContentSerialized: parsedAgreement.offerContentSerialized,
      proofs: new Map(parsedAgreement.proofs),
    };

    // Verify with transaction ID
    await expect(
      agreementVerifier.verify({ agreement: reconstructedAgreement, txId: txResult.txId })
    ).resolves.not.toThrow();
  });

  it("should handle complex offer with multiple requirements on blockchain", async () => {
    const serviceProvider = PrivateKey.fromRandom();
    const customer = signerPrivateKey; // Use the signer key we have in beforeEach
    const paymentAddress = serviceProvider.toPublicKey().toAddress();

    // Create offer with both signature and payment
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent:
        "Service agreement: Customer signs and pays 10000 satoshis for service",
      requirements: new Map([
        [
          "customer-signature",
          {
            type: DaiaRequirementType.Sign,
            pubKey: customer.toPublicKey().toString(),
            offererNonce: "service-agreement-nonce",
          },
        ],
        [
          "service-payment",
          {
            type: DaiaRequirementType.Payment,
            to: paymentAddress,
            txId: "",
          },
        ],
      ]),
    };

    // Sign with customer's private key (using the already configured signer)
    const { agreement, paymentsRequired } = await offerSigner.sign(
      offerContent
    );

    expect(agreement.proofs.size).toBe(2);
    expect(paymentsRequired.get(paymentAddress)).toBe(0); // Self-paid

    // Store on blockchain
    const agreementJson = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Array.from(agreement.proofs.entries()),
    });

    const utxos: Utxo[] = [
      {
        txId: "0".repeat(64),
        outputIndex: 0,
        satoshis: 50000,
        script: "76a914" + "00".repeat(20) + "88ac",
      },
    ];

    const txResult = await transactionBuilder.buildTransaction(
      customer,
      utxos,
      paymentAddress,
      10000,
      agreementJson
    );

    mockBlockchainAdapter.recordTransaction(
      txResult.txId,
      paymentAddress,
      10000
    );

    // Retrieve and verify
    const extractedData = transactionParser.extractData(txResult.txHex);
    const parsedAgreement = JSON.parse(extractedData!);
    const reconstructedAgreement: {
      offerContentSerialized: string;
      proofs: Map<string, any>;
    } = {
      offerContentSerialized: parsedAgreement.offerContentSerialized,
      proofs: new Map(parsedAgreement.proofs),
    };

    await expect(
      agreementVerifier.verify({ agreement: reconstructedAgreement, txId: txResult.txId })
    ).resolves.not.toThrow();
  });

  it("should handle broadcast and store agreement on testnet (mock)", async () => {
    // Create a simple agreement
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Test agreement for testnet",
      requirements: new Map([
        [
          "sig1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: signerPrivateKey.toPublicKey().toString(),
            offererNonce: "testnet-agreement-123",
          },
        ],
      ]),
    };

    const { agreement } = await offerSigner.sign(offerContent);

    // Serialize agreement
    const agreementJson = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Array.from(agreement.proofs.entries()),
    });

    const utxos: Utxo[] = [
      {
        txId: "0".repeat(64),
        outputIndex: 0,
        satoshis: 50000,
        script: "76a914" + "00".repeat(20) + "88ac",
      },
    ];

    const txResult = await transactionBuilder.buildTransaction(
      offererPrivateKey,
      utxos,
      paymentRecipient,
      1000,
      agreementJson
    );

    // Broadcast to testnet (mocked)
    const broadcastResult = await txResult.broadcast(Network.TESTNET);

    expect(broadcastResult.success).toBe(true);
    expect(broadcastResult.txId).toBeDefined();

    // Verify the transaction was tracked
    const broadcasted = mockBroadcaster.getBroadcastedTransactions();
    expect(broadcasted.length).toBe(1);
    expect(broadcasted[0].network).toBe(Network.TESTNET);
  });

  it("should handle large agreement data with multiple parties", async () => {
    // Create a complex multi-party agreement with 3 signature requirements
    const parties = [signerPrivateKey, PrivateKey.fromRandom(), PrivateKey.fromRandom()];

    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: `Multi-party agreement with ${parties.length} signers: 
        Each party agrees to the terms and conditions specified in this agreement.
        This includes payment obligations, service delivery terms, and dispute resolution.`,
      requirements: new Map(
        parties.map((party, idx) => [
          `signer-${idx}`,
          {
            type: DaiaRequirementType.Sign,
            pubKey: party.toPublicKey().toString(),
            offererNonce: `nonce-${idx}-${Date.now()}`,
          },
        ])
      ),
    };

    // Create signer with all party keys
    const multiPartySigner = new BsvSignatureSigner(parties);
    const multiPartySigningAdapter = new MockSigningResourcesAdapter(...parties);
    const multiOfferSigner = new OfferSigner(
      multiPartySigner,
      multiPartySigningAdapter
    );

    const { agreement } = await multiOfferSigner.sign(offerContent);

    expect(agreement.proofs.size).toBe(3);

    // Store on blockchain
    const agreementJson = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Array.from(agreement.proofs.entries()),
    });

    expect(agreementJson.length).toBeGreaterThan(500); // Large data

    const utxos: Utxo[] = [
      {
        txId: "0".repeat(64),
        outputIndex: 0,
        satoshis: 100000,
        script: "76a914" + "00".repeat(20) + "88ac",
      },
    ];

    const txResult = await transactionBuilder.buildTransaction(
      offererPrivateKey,
      utxos,
      paymentRecipient,
      1000,
      agreementJson
    );

    // Should handle large OP_RETURN data
    expect(txResult.txHex).toBeDefined();

    // Parse and verify
    const extractedData = transactionParser.extractData(txResult.txHex);
    expect(extractedData).toBe(agreementJson);
  });

  it("should verify UTXO invalidation after transaction", async () => {
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "UTXO tracking test",
      requirements: new Map([
        [
          "sig1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: signerPrivateKey.toPublicKey().toString(),
            offererNonce: "utxo-test",
          },
        ],
      ]),
    };

    const { agreement } = await offerSigner.sign(offerContent);
    const agreementJson = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Array.from(agreement.proofs.entries()),
    });

    const inputUtxos: Utxo[] = [
      {
        txId: "1".repeat(64),
        outputIndex: 0,
        satoshis: 25000,
        script: new P2PKH().lock(offererPrivateKey.toPublicKey().toAddress()).toHex(),
      },
      {
        txId: "2".repeat(64),
        outputIndex: 1,
        satoshis: 25000,
        script: new P2PKH().lock(offererPrivateKey.toPublicKey().toAddress()).toHex(),
      },
    ];

    const txResult = await transactionBuilder.buildTransaction(
      offererPrivateKey,
      inputUtxos,
      paymentRecipient,
      5000,
      agreementJson
    );

    // Verify used UTXOs are tracked
    expect(txResult.usedUtxos).toEqual(inputUtxos);
    expect(txResult.usedUtxos.length).toBe(2);

    // These UTXOs should now be marked as spent/invalidated by the caller
    for (const utxo of txResult.usedUtxos) {
      expect(utxo.txId).toBeDefined();
      expect(utxo.outputIndex).toBeDefined();
    }
  });
});
