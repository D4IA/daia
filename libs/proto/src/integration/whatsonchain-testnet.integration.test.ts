import { describe, it, expect, beforeAll } from "vitest";
import { PrivateKey, Transaction } from "@bsv/sdk";
import {
  DaiaOfferContent,
  DaiaRequirementType,
} from "../types/offer";
import { OfferSigner } from "../verification/OfferSigner";
import { AgreementVerifier } from "../verification/AgreementVerifier";
import {
  BsvSignatureSigner,
  BsvSignatureVerifier,
} from "../verification/BsvSignatureAdapter";
import { WhatsOnChainAdapter } from "../verification/WhatsOnChainAdapter";
import {
  TransactionBuilder,
  TransactionParser,
  WhatsOnChainBroadcaster,
  Network,
} from "../blockchain";
import { Utxo } from "../blockchain/types";
import { P2PKH } from "@bsv/sdk";
import * as fs from "fs";
import * as path from "path";

/**
 * Integration tests using real WhatsOnChain testnet API.
 * 
 * ⚠️  These tests require:
 * 1. A funded testnet address (see test-addr.txt)
 * 2. Internet connection
 * 3. WhatsOnChain API availability
 * 
 * These tests are skipped by default to avoid:
 * - Spending limited testnet satoshis
 * - API rate limiting
 * - Network dependency in CI/CD
 * 
 * To run these tests manually:
 * 1. Ensure the testnet address has sufficient funds (use faucet if needed)
 * 2. Run: pnpm test -- whatsonchain-testnet.integration.test.ts
 */

/**
 * Mock signing resources adapter for testing
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
    return null;
  }
}

/**
 * Load testnet credentials from test-addr.txt
 */
function loadTestnetCredentials(): {
  privateKey: PrivateKey;
  address: string;
} | null {
  try {
    const testAddrPath = path.join(__dirname, "../../test-addr.txt");
    const content = fs.readFileSync(testAddrPath, "utf-8");

    // Parse WIF private key
    const wifMatch = content.match(/Private Key \(WIF\): (.+)/);
    const addressMatch = content.match(/Testnet Address: (.+)/);

    if (!wifMatch || !addressMatch) {
      return null;
    }

    const privateKey = PrivateKey.fromWif(wifMatch[1]);
    const address = addressMatch[1].trim();

    return { privateKey, address };
  } catch (error) {
    console.error("Failed to load testnet credentials:", error);
    return null;
  }
}

describe.skip("WhatsOnChain Testnet Integration", () => {
  let testnetPrivateKey: PrivateKey;
  let testnetAddress: string;
  let blockchainAdapter: WhatsOnChainAdapter;
  let broadcaster: WhatsOnChainBroadcaster;
  let transactionBuilder: TransactionBuilder;
  let transactionParser: TransactionParser;

  beforeAll(() => {
    const credentials = loadTestnetCredentials();
    if (!credentials) {
      throw new Error(
        "Failed to load testnet credentials from test-addr.txt. " +
          "Please ensure the file exists and contains valid credentials."
      );
    }

    testnetPrivateKey = credentials.privateKey;
    testnetAddress = credentials.address;

    // Setup components for testnet
    blockchainAdapter = new WhatsOnChainAdapter("test");
    broadcaster = new WhatsOnChainBroadcaster();
    transactionBuilder = new TransactionBuilder(broadcaster);
    transactionParser = new TransactionParser();

    console.log(`Using testnet address: ${testnetAddress}`);
  });

  describe("WhatsOnChain API Integration", () => {
    it("should fetch UTXOs from testnet address", async () => {
      // This test verifies we can fetch UTXOs from WhatsOnChain
      // Note: This requires the address to have some testnet satoshis
      
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/test/address/${testnetAddress}/unspent`
      );

      expect(response.ok).toBe(true);
      const utxos = await response.json();
      
      // Should return an array (may be empty if address has no funds)
      expect(Array.isArray(utxos)).toBe(true);
      
      if (utxos.length > 0) {
        console.log(`Found ${utxos.length} UTXO(s) with total ${utxos.reduce((sum: number, u: any) => sum + u.value, 0)} satoshis`);
        
        // Verify UTXO structure
        const utxo = utxos[0];
        expect(utxo).toHaveProperty("tx_hash");
        expect(utxo).toHaveProperty("tx_pos");
        expect(utxo).toHaveProperty("value");
      } else {
        console.warn(
          `⚠️  No UTXOs found. Fund the address at: https://faucet.bitcoincloud.net/`
        );
      }
    });

    it("should verify transaction existence on testnet", async () => {
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // First, get any existing transaction for this address
      const response = await fetch(
        `https://api.whatsonchain.com/v1/bsv/test/address/${testnetAddress}/history`
      );

      expect(response.ok).toBe(true);
      const history = await response.json();

      if (history.length > 0) {
        const txId = history[0].tx_hash;
        console.log(`Verifying transaction: ${txId}`);

        // Add delay before next API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Use the blockchain adapter to verify
        const verification = await blockchainAdapter.verifyPayment(txId);

        expect(verification.exists).toBe(true);
        expect(verification.isConfirmed).toBeDefined();
        
        console.log(
          `Transaction ${verification.isConfirmed ? "confirmed" : "unconfirmed"}`
        );
      } else {
        console.warn("⚠️  No transaction history found for this address");
      }
    });
  });

  describe("Agreement Creation and Storage on Testnet", () => {
    it("should create, sign, and store agreement on testnet (dry-run)", async () => {
      // This is a DRY RUN - we prepare the transaction but DON'T broadcast
      // to avoid spending limited testnet satoshis

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Setup signers
      const signatureSigner = new BsvSignatureSigner([testnetPrivateKey]);
      const signatureVerifier = new BsvSignatureVerifier();
      const signingAdapter = new MockSigningResourcesAdapter(testnetPrivateKey);

      const offerSigner = new OfferSigner(signatureSigner, signingAdapter);
      const agreementVerifier = new AgreementVerifier(
        blockchainAdapter,
        signatureVerifier
      );

      // Create an offer
      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent:
          "Test agreement for testnet - This is a DRY RUN",
        requirements: new Map([
          [
            "signature1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: testnetPrivateKey.toPublicKey().toString(),
              offererNonce: `testnet-${Date.now()}`,
            },
          ],
        ]),
      };

      // Sign the offer
      const { agreement } = await offerSigner.sign(offerContent);

      expect(agreement.proofs.size).toBe(1);

      // Serialize for blockchain storage
      const agreementJson = JSON.stringify({
        offerContentSerialized: agreement.offerContentSerialized,
        proofs: Array.from(agreement.proofs.entries()),
      });

      console.log(`Agreement data size: ${agreementJson.length} bytes`);

      // Fetch UTXOs from testnet
      const utxosResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/test/address/${testnetAddress}/unspent`
      );
      
      if (!utxosResponse.ok) {
        const errorText = await utxosResponse.text();
        console.warn(`⚠️  Failed to fetch UTXOs: ${errorText.substring(0, 100)}`);
        console.warn("⚠️  Skipping transaction creation due to API error");
        return;
      }

      const utxosData = await utxosResponse.json();

      if (utxosData.length === 0) {
        console.warn(
          "⚠️  No UTXOs available. Cannot proceed with transaction creation."
        );
        return;
      }

      // Convert to our UTXO format
      const utxos: Utxo[] = utxosData
        .slice(0, 2) // Use up to 2 UTXOs
        .map((u: any) => ({
          txId: u.tx_hash,
          outputIndex: u.tx_pos,
          satoshis: u.value,
          script: new P2PKH().lock(testnetAddress).toHex(),
        }));

      const totalSats = utxos.reduce((sum, u) => sum + u.satoshis, 0);
      console.log(`Using ${utxos.length} UTXO(s) with ${totalSats} satoshis`);

      // Create recipient address (send back to ourselves with smaller amount)
      const recipientAddress = testnetAddress;

      // Build transaction (but don't broadcast)
      const txResult = await transactionBuilder.buildTransaction(
        testnetPrivateKey,
        utxos,
        recipientAddress,
        1000, // Send 1000 sats
        agreementJson
      );

      expect(txResult.txHex).toBeDefined();
      expect(txResult.txId).toBeDefined();
      expect(txResult.tx).toBeDefined();

      console.log(`Transaction ID (not broadcast): ${txResult.txId}`);
      console.log(`Transaction size: ${txResult.txHex.length / 2} bytes`);

      // Verify we can parse the data back
      const extractedData = transactionParser.extractData(txResult.txHex);
      expect(extractedData).toBe(agreementJson);

      // Reconstruct and verify agreement (before broadcast)
      const parsedAgreement = JSON.parse(extractedData!);
      const reconstructedAgreement: {
        offerContentSerialized: string;
        proofs: Map<string, any>;
      } = {
        offerContentSerialized: parsedAgreement.offerContentSerialized,
        proofs: new Map(parsedAgreement.proofs),
      };

      // Verify using the Transaction object (mempool verification)
      await expect(
        agreementVerifier.verify({
          agreement: reconstructedAgreement,
          tx: txResult.tx,
        })
      ).resolves.not.toThrow();

      console.log("✅ Agreement verified successfully (before broadcast)");
      console.log(
        "⚠️  Transaction NOT broadcast to preserve testnet satoshis"
      );
    });

    it("should verify agreement using Transaction object (mempool verification)", async () => {
      // This test demonstrates verifying an agreement before it's broadcast
      // by passing the Transaction object directly

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const signatureSigner = new BsvSignatureSigner([testnetPrivateKey]);
      const signatureVerifier = new BsvSignatureVerifier();
      const signingAdapter = new MockSigningResourcesAdapter(testnetPrivateKey);

      const offerSigner = new OfferSigner(signatureSigner, signingAdapter);
      const agreementVerifier = new AgreementVerifier(
        blockchainAdapter,
        signatureVerifier
      );

      // Create offer with payment requirement (self-paid)
      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Payment test for mempool verification",
        requirements: new Map([
          [
            "signature1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: testnetPrivateKey.toPublicKey().toString(),
              offererNonce: `mempool-test-${Date.now()}`,
            },
          ],
        ]),
      };

      const { agreement } = await offerSigner.sign(offerContent);

      expect(agreement.proofs.size).toBe(1);

      // Create a mock transaction for verification
      // In real scenario, this would be the actual transaction being created
      const mockTx = new Transaction();
      // Add a mock output to the recipient
      mockTx.addOutput({
        lockingScript: new P2PKH().lock(testnetAddress),
        satoshis: 1000,
      });

      const txId = mockTx.id("hex") as string;

      console.log(`Mock transaction ID: ${txId}`);

      // Verify using Transaction object (before broadcast)
      await expect(
        agreementVerifier.verify({
          agreement,
          tx: mockTx,
        })
      ).resolves.not.toThrow();

      console.log(
        "✅ Agreement verified using Transaction object"
      );

      // Also test with txId string (signature-only, no payment to verify)
      await expect(
        agreementVerifier.verify({
          agreement,
        })
      ).resolves.not.toThrow();

      console.log("✅ Agreement verified without transaction (signature-only)");
    });
  });

  describe("Real Testnet Broadcast (MANUAL ONLY)", () => {
    it.skip("should broadcast transaction to testnet (MANUAL TEST - COSTS SATS)", async () => {
      // ⚠️  THIS TEST IS SKIPPED BY DEFAULT ⚠️
      // To run this test manually, remove the .skip and run:
      // pnpm test -- whatsonchain-testnet.integration.test.ts --run
      //
      // WARNING: This will spend real testnet satoshis!

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const signatureSigner = new BsvSignatureSigner([testnetPrivateKey]);
      const signingAdapter = new MockSigningResourcesAdapter(testnetPrivateKey);
      const offerSigner = new OfferSigner(signatureSigner, signingAdapter);

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: `REAL BROADCAST TEST - ${new Date().toISOString()}`,
        requirements: new Map([
          [
            "sig1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: testnetPrivateKey.toPublicKey().toString(),
              offererNonce: `broadcast-${Date.now()}`,
            },
          ],
        ]),
      };

      const { agreement } = await offerSigner.sign(offerContent);

      const agreementJson = JSON.stringify({
        offerContentSerialized: agreement.offerContentSerialized,
        proofs: Array.from(agreement.proofs.entries()),
      });

      // Fetch UTXOs
      const utxosResponse = await fetch(
        `https://api.whatsonchain.com/v1/bsv/test/address/${testnetAddress}/unspent`
      );
      const utxosData = await utxosResponse.json();

      if (utxosData.length === 0) {
        throw new Error("No UTXOs available. Fund the address first.");
      }

      const utxos: Utxo[] = utxosData.slice(0, 1).map((u: any) => ({
        txId: u.tx_hash,
        outputIndex: u.tx_pos,
        satoshis: u.value,
        script: new P2PKH().lock(testnetAddress).toHex(),
      }));

      const txResult = await transactionBuilder.buildTransaction(
        testnetPrivateKey,
        utxos,
        testnetAddress,
        500,
        agreementJson
      );

      // BROADCAST TO TESTNET
      const broadcastResult = await txResult.broadcast(Network.TESTNET);

      expect(broadcastResult.success).toBe(true);
      expect(broadcastResult.txId).toBe(txResult.txId);

      console.log(`✅ Transaction broadcast to testnet: ${broadcastResult.txId}`);
      console.log(
        `View at: https://test.whatsonchain.com/tx/${broadcastResult.txId}`
      );

      // Wait a moment for the transaction to propagate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify the transaction exists on-chain
      const verification = await blockchainAdapter.verifyPayment(
        broadcastResult.txId!
      );

      expect(verification.exists).toBe(true);
      console.log(
        `Transaction ${verification.isConfirmed ? "confirmed" : "in mempool"}`
      );
    });
  });
});
