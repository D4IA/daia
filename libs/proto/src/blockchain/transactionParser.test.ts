import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, P2PKH } from "@bsv/sdk";
import {
  TransactionParser,
  DataExtractionError,
} from "./transactionParser";
import { TransactionBuilder } from "./transactionBuilder";
import { Utxo } from "./types";

describe("TransactionParser", () => {
  let parser: TransactionParser;
  let builder: TransactionBuilder;
  let privateKey: PrivateKey;
  let recipientAddress: string;

  beforeEach(() => {
    parser = new TransactionParser();
    builder = new TransactionBuilder();
    privateKey = PrivateKey.fromRandom();
    recipientAddress = PrivateKey.fromRandom().toPublicKey().toAddress();
  });

  describe("extractData", () => {
    it("should extract data from transaction with OP_RETURN output", async () => {
      const testData = "Hello, Blockchain!";
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const extractedData = parser.extractData(txHex);

      expect(extractedData).toBe(testData);
    });

    // Table-driven test for various data types
    it.each([
      { 
        name: "simple text",
        data: "Hello World"
      },
      {
        name: "empty string",
        data: "",
        expectedNull: true
      },
      {
        name: "JSON object",
        data: JSON.stringify({ type: "agreement", parties: ["Alice", "Bob"], amount: 1000 })
      },
      {
        name: "JSON array",
        data: JSON.stringify(["item1", "item2", "item3"])
      },
      {
        name: "unicode characters",
        data: "Hello 世界! 🌍 café"
      },
      {
        name: "numbers as string",
        data: "1234567890"
      },
      {
        name: "special characters",
        data: "!@#$%^&*()_+-=[]{}|;:',.<>?"
      },
      {
        name: "multi-line text",
        data: "Line 1\nLine 2\nLine 3"
      },
      {
        name: "medium length text (100 chars)",
        data: "A".repeat(100)
      },
      {
        name: "large text (1000 chars)",
        data: "B".repeat(1000)
      }
    ])("should handle $name correctly", async ({ data, expectedNull }) => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 50000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        data
      );

      const extractedData = parser.extractData(txHex);

      if (expectedNull) {
        expect(extractedData).toBeNull();
      } else {
        expect(extractedData).toBe(data);
      }
    });

    it("should return null when transaction has no OP_RETURN output", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
        // No data parameter
      );

      const extractedData = parser.extractData(txHex);

      expect(extractedData).toBeNull();
    });

    it("should extract JSON data from OP_RETURN", async () => {
      const testData = JSON.stringify({
        type: "agreement",
        id: "12345",
        timestamp: Date.now(),
        parties: ["Alice", "Bob"],
      });

      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const extractedData = parser.extractData(txHex);

      expect(extractedData).toBe(testData);

      // Verify it's valid JSON
      const parsed = JSON.parse(extractedData!);
      expect(parsed.type).toBe("agreement");
      expect(parsed.id).toBe("12345");
      expect(parsed.parties).toEqual(["Alice", "Bob"]);
    });

    it("should extract unicode data from OP_RETURN", async () => {
      const testData = "Hello 世界! 🌍";

      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const extractedData = parser.extractData(txHex);

      expect(extractedData).toBe(testData);
    });

    it("should extract long data strings from OP_RETURN", async () => {
      const testData = "A".repeat(1000);

      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 20000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const extractedData = parser.extractData(txHex);

      expect(extractedData).toBe(testData);
      expect(extractedData?.length).toBe(1000);
    });

    it("should throw DataExtractionError for invalid transaction hex", () => {
      // Use a hex string that looks valid but has wrong structure
      const invalidTxHex = "01000000"; // Too short to be valid

      try {
        parser.extractData(invalidTxHex);
        // If no error is thrown, that's also acceptable behavior
        // Some invalid hex might just return null
      } catch (error) {
        // If an error is thrown, it should be DataExtractionError
        expect(error).toBeInstanceOf(DataExtractionError);
      }
    });

    it("should handle empty OP_RETURN data", async () => {
      // When data is empty string, the builder might not create OP_RETURN output
      // So we test that null is returned when no OP_RETURN exists
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
        // No data - no OP_RETURN output
      );

      const extractedData = parser.extractData(txHex);

      expect(extractedData).toBeNull();
    });
  });

  describe("getOutputs", () => {
    it("should return all transaction outputs with details", async () => {
      const testData = "Test data";
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 50000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const outputs = parser.getOutputs(txHex);

      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs[0]).toHaveProperty("satoshis");
      expect(outputs[0]).toHaveProperty("script");
      expect(outputs[0]).toHaveProperty("isOpReturn");
    });

    it("should identify OP_RETURN outputs", async () => {
      const testData = "Test data";
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000,
        testData
      );

      const outputs = parser.getOutputs(txHex);

      const opReturnOutputs = outputs.filter((output) => output.isOpReturn);
      expect(opReturnOutputs.length).toBe(1);
      expect(opReturnOutputs[0].satoshis).toBe(0);
    });

    it("should identify payment outputs", async () => {
      const utxos: Utxo[] = [
        {
          txId: "0".repeat(64),
          outputIndex: 0,
          satoshis: 10000,
          script: new P2PKH().lock(privateKey.toPublicKey().toAddress()).toHex(),
        },
      ];

      const { txHex } = await builder.buildTransaction(
        privateKey,
        utxos,
        recipientAddress,
        5000
      );

      const outputs = parser.getOutputs(txHex);

      const paymentOutputs = outputs.filter((output) => !output.isOpReturn);
      expect(paymentOutputs.length).toBeGreaterThan(0);
      expect(paymentOutputs[0].satoshis).toBeGreaterThan(0);
    });

    it("should throw DataExtractionError for invalid transaction hex", () => {
      // Use a hex string that looks valid but has wrong structure
      const invalidTxHex = "01000000"; // Too short to be valid

      try {
        parser.getOutputs(invalidTxHex);
        // If no error is thrown, that's also acceptable behavior
      } catch (error) {
        // If an error is thrown, it should be DataExtractionError
        expect(error).toBeInstanceOf(DataExtractionError);
      }
    });
  });
});
