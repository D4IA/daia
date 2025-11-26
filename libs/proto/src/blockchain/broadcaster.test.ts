import { describe, it, expect, beforeEach } from "vitest";
import {
  WhatsOnChainBroadcaster,
  MockBroadcaster,
  Network,
} from "./broadcaster";

describe("MockBroadcaster", () => {
  let broadcaster: MockBroadcaster;

  beforeEach(() => {
    broadcaster = new MockBroadcaster();
  });

  it("should successfully broadcast transaction", async () => {
    const mockTxHex = "0100000001".repeat(10);

    const result = await broadcaster.broadcast(mockTxHex, Network.TESTNET);

    expect(result.success).toBe(true);
    expect(result.txId).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("should track broadcasted transactions", async () => {
    const mockTxHex1 = "0100000001".repeat(10);
    const mockTxHex2 = "0100000002".repeat(10);

    await broadcaster.broadcast(mockTxHex1, Network.TESTNET);
    await broadcaster.broadcast(mockTxHex2, Network.MAINNET);

    const broadcasted = broadcaster.getBroadcastedTransactions();

    expect(broadcasted.length).toBe(2);
    expect(broadcasted[0].network).toBe(Network.TESTNET);
    expect(broadcasted[1].network).toBe(Network.MAINNET);
  });

  it("should fail when configured to fail", async () => {
    const mockTxHex = "0100000001".repeat(10);

    broadcaster.setFailure(true, "Custom error message");
    const result = await broadcaster.broadcast(mockTxHex, Network.TESTNET);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Custom error message");
    expect(result.txId).toBeUndefined();
  });

  it("should clear broadcasted transactions", async () => {
    const mockTxHex = "0100000001".repeat(10);

    await broadcaster.broadcast(mockTxHex, Network.TESTNET);
    expect(broadcaster.getBroadcastedTransactions().length).toBe(1);

    broadcaster.clear();
    expect(broadcaster.getBroadcastedTransactions().length).toBe(0);
  });

  it("should generate unique txIds for different transactions", async () => {
    const mockTxHex1 = "0100000001".repeat(10);
    const mockTxHex2 = "0100000002".repeat(10);

    const result1 = await broadcaster.broadcast(mockTxHex1, Network.TESTNET);
    const result2 = await broadcaster.broadcast(mockTxHex2, Network.TESTNET);

    expect(result1.txId).not.toBe(result2.txId);
  });
});

describe("WhatsOnChainBroadcaster", () => {
  let broadcaster: WhatsOnChainBroadcaster;

  beforeEach(() => {
    broadcaster = new WhatsOnChainBroadcaster();
  });

  it("should be instantiable", () => {
    expect(broadcaster).toBeInstanceOf(WhatsOnChainBroadcaster);
  });

  // Note: We don't test actual broadcasting to avoid hitting the real API
  // in unit tests. Integration tests should be created separately for that.
});
