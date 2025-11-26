import { describe, it, expect, beforeEach, vi } from "vitest";
import { WhatsOnChainAdapter, type WhatsOnChainNetwork } from "./WhatsOnChainAdapter";

describe("WhatsOnChainAdapter", () => {
  let adapter: WhatsOnChainAdapter;

  beforeEach(() => {
    // Reset mocks before each test
    global.fetch = vi.fn();
  });

  describe("Constructor", () => {
    it("should default to mainnet", () => {
      adapter = new WhatsOnChainAdapter();
      expect(adapter).toBeDefined();
    });

    it("should accept testnet network", () => {
      adapter = new WhatsOnChainAdapter("test");
      expect(adapter).toBeDefined();
    });
  });

  describe("verifyPayment", () => {
    const MOCK_TX_ID = "1234567890abcdef";

    beforeEach(() => {
      adapter = new WhatsOnChainAdapter("main");
    });

    it("should return exists: true for confirmed transaction", async () => {
      const mockTx = {
        txid: MOCK_TX_ID,
        vout: [
          {
            value: 1000,
            scriptPubKey: {
              addresses: ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"],
            },
          },
        ],
        confirmations: 3,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await adapter.verifyPayment(MOCK_TX_ID);

      expect(result).toEqual({
        exists: true,
        recipient: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        amount: 1000,
        isConfirmed: true,
      });
    });

    it("should return isConfirmed: false for unconfirmed transaction", async () => {
      const mockTx = {
        txid: MOCK_TX_ID,
        vout: [
          {
            value: 500,
            scriptPubKey: {
              addresses: ["1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"],
            },
          },
        ],
        confirmations: 0,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await adapter.verifyPayment(MOCK_TX_ID);

      expect(result.isConfirmed).toBe(false);
      expect(result.exists).toBe(true);
    });

    it("should return isConfirmed: false when confirmations is undefined", async () => {
      const mockTx = {
        txid: MOCK_TX_ID,
        vout: [
          {
            value: 500,
            scriptPubKey: {
              addresses: ["1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"],
            },
          },
        ],
        // No confirmations field
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await adapter.verifyPayment(MOCK_TX_ID);

      expect(result.isConfirmed).toBe(false);
    });

    it("should return exists: false for non-existent transaction", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await adapter.verifyPayment("nonexistent");

      expect(result).toEqual({
        exists: false,
        recipient: "",
        amount: 0,
        isConfirmed: false,
      });
    });

    it("should return exists: false for transaction with no outputs", async () => {
      const mockTx = {
        txid: MOCK_TX_ID,
        vout: [],
        confirmations: 1,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await adapter.verifyPayment(MOCK_TX_ID);

      expect(result.exists).toBe(false);
    });

    it("should handle output with no addresses", async () => {
      const mockTx = {
        txid: MOCK_TX_ID,
        vout: [
          {
            value: 2000,
            scriptPubKey: {
              // No addresses field (non-standard script)
              asm: "OP_RETURN 1234",
              type: "nulldata",
            },
          },
        ],
        confirmations: 5,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await adapter.verifyPayment(MOCK_TX_ID);

      expect(result).toEqual({
        exists: true,
        recipient: "",
        amount: 2000,
        isConfirmed: true,
      });
    });

    it("should use first output when multiple outputs exist", async () => {
      const mockTx = {
        txid: MOCK_TX_ID,
        vout: [
          {
            value: 1000,
            scriptPubKey: {
              addresses: ["FirstAddress"],
            },
          },
          {
            value: 2000,
            scriptPubKey: {
              addresses: ["SecondAddress"],
            },
          },
        ],
        confirmations: 2,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await adapter.verifyPayment(MOCK_TX_ID);

      expect(result.recipient).toBe("FirstAddress");
      expect(result.amount).toBe(1000);
    });

    it("should throw error for API errors other than 404", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(adapter.verifyPayment(MOCK_TX_ID)).rejects.toThrow(
        "WhatsOnChain API error: 500 Internal Server Error"
      );
    });
  });

  describe("Network Configuration", () => {
    it("should use mainnet URL when network is main", async () => {
      adapter = new WhatsOnChainAdapter("main");
      const mockTx = {
        txid: "test",
        vout: [{ value: 100, scriptPubKey: { addresses: ["addr"] } }],
        confirmations: 1,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      await adapter.verifyPayment("test");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.whatsonchain.com/v1/bsv/main/tx/test"
      );
    });

    it("should use testnet URL when network is test", async () => {
      adapter = new WhatsOnChainAdapter("test");
      const mockTx = {
        txid: "test",
        vout: [{ value: 100, scriptPubKey: { addresses: ["addr"] } }],
        confirmations: 1,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      await adapter.verifyPayment("test");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.whatsonchain.com/v1/bsv/test/tx/test"
      );
    });
  });
});
