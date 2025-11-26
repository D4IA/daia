import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, Script, P2PKH } from "@bsv/sdk";
import {
  TransactionBuilder,
  InsufficientFundsError,
} from "./transactionBuilder";
import { Utxo } from "./types";
import { MockBroadcaster, Network } from "./broadcaster";

describe("TransactionBuilder", () => {
  let builder: TransactionBuilder;
  let mockBroadcaster: MockBroadcaster;
  let privateKey: PrivateKey;
  let recipientAddress: string;

  beforeEach(() => {
    mockBroadcaster = new MockBroadcaster();
    builder = new TransactionBuilder(mockBroadcaster);
    // Use a test private key
    privateKey = PrivateKey.fromRandom();
    recipientAddress = PrivateKey.fromRandom().toPublicKey().toAddress();
  });

  describe("buildTransaction", () => {
    it("should create transaction with payment output only", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      expect(result.txHex).toBeDefined();
      expect(result.txId).toBeDefined();
      expect(result.tx).toBeDefined();
      expect(typeof result.txHex).toBe("string");
      expect(result.txHex.length).toBeGreaterThan(0);
    });

    it("should create transaction with payment and data output", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const testData = "Hello, Blockchain!";
      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      expect(result.txHex).toBeDefined();
      expect(result.txId).toBeDefined();
      expect(result.tx.outputs.length).toBeGreaterThanOrEqual(2);

      // Check for OP_RETURN output
      const hasOpReturn = result.tx.outputs.some((output: any) => {
        const asm = output.lockingScript.toASM();
        return asm.includes("OP_RETURN");
      });
      expect(hasOpReturn).toBe(true);
    });

    it("should include change output when UTXOs exceed required amount", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 100000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      // Should have at least 2 outputs: payment + change
      expect(result.tx.outputs.length).toBeGreaterThanOrEqual(2);
    });

    it("should use multiple UTXOs when single UTXO is insufficient", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 3000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
        {
          txId: "1".repeat(64),
          outputIndex: 0,
          satoshis: 3000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      expect(result.txHex).toBeDefined();
      expect(result.tx.inputs.length).toBe(2);
    });

    it("should throw InsufficientFundsError when UTXOs are insufficient", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 1000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      await expect(
        builder.buildTransaction(privateKey, utxos, recipientAddress, 10000)
      ).rejects.toThrow(InsufficientFundsError);
    });

    it("should throw error when amount is below dust limit", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      await expect(
        builder.buildTransaction(privateKey, utxos, recipientAddress, 0)
      ).rejects.toThrow("Amount must be at least");
    });

    it("should use custom change address when provided", async () => {
      const customChangeAddress = PrivateKey.fromRandom()
        .toPublicKey()
        .toAddress();

      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 100000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        undefined,
        customChangeAddress
      );

      // Change output should exist and use custom address
      expect(result.tx.outputs.length).toBeGreaterThan(1);
    });

    it("should embed arbitrary string data in OP_RETURN", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const testData = JSON.stringify({
        type: "agreement",
        id: "12345",
        timestamp: Date.now(),
      });

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const opReturnOutput = result.tx.outputs.find((output: any) => {
        const asm = output.lockingScript.toASM();
        return asm.includes("OP_RETURN");
      });

      expect(opReturnOutput).toBeDefined();
      expect(opReturnOutput.satoshis).toBe(0);
    });
  });

  describe("selectUtxos", () => {
    it("should select single UTXO when sufficient", () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: "mock_script",
        },
        {
          txId: "1".repeat(64),
          outputIndex: 0,
          satoshis: 5000,
          script: "mock_script",
        },
      ];

      const selected = builder.selectUtxos(utxos, 8000);

      expect(selected.length).toBe(1);
      expect(selected[0].satoshis).toBe(10000);
    });

    it("should select multiple UTXOs when necessary", () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 3000,
          script: "mock_script",
        },
        {
          txId: "1".repeat(64),
          outputIndex: 0,
          satoshis: 3000,
          script: "mock_script",
        },
        {
          txId: "2".repeat(64),
          outputIndex: 0,
          satoshis: 3000,
          script: "mock_script",
        },
      ];

      const selected = builder.selectUtxos(utxos, 8000);

      expect(selected.length).toBeGreaterThan(1);
      const total = selected.reduce((sum, utxo) => sum + utxo.satoshis, 0);
      expect(total).toBeGreaterThanOrEqual(8000);
    });

    it("should prefer larger UTXOs first", () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 1000,
          script: "mock_script",
        },
        {
          txId: "1".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: "mock_script",
        },
        {
          txId: "2".repeat(64),
          outputIndex: 0,
          satoshis: 5000,
          script: "mock_script",
        },
      ];

      const selected = builder.selectUtxos(utxos, 8000);

      expect(selected[0].satoshis).toBe(10000);
    });

    it("should return empty array when no UTXOs available", () => {
      const selected = builder.selectUtxos([], 1000);
      expect(selected).toEqual([]);
    });
  });

  describe("broadcast", () => {
    it("should have broadcast method on build result", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      expect(result.broadcast).toBeDefined();
      expect(typeof result.broadcast).toBe("function");
    });

    it("should successfully broadcast transaction", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      const broadcastResult = await result.broadcast(Network.TESTNET);

      expect(broadcastResult.success).toBe(true);
      expect(broadcastResult.txId).toBeDefined();
    });

    it("should track broadcasted transactions", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      await result.broadcast(Network.MAINNET);

      const broadcasted = mockBroadcaster.getBroadcastedTransactions();
      expect(broadcasted.length).toBe(1);
      expect(broadcasted[0].network).toBe(Network.MAINNET);
    });

    it("should handle broadcast failures", async () => {
      mockBroadcaster.setFailure(true, "Network error");

      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const result = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      const broadcastResult = await result.broadcast(Network.TESTNET);

      expect(broadcastResult.success).toBe(false);
      expect(broadcastResult.error).toBe("Network error");
    });
  });
});
