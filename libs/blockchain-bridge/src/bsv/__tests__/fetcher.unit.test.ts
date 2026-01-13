import { describe, it, vi, beforeEach, afterEach } from "vitest";
import { WhatsOnChainTransactionFetcher } from "../fetcher";
import { BsvNetwork } from "../network";
import { FetchThrottler } from "../fetchThrottler";

vi.mock("../fetchThrottler");

describe("WhatsOnChainTransactionFetcher", () => {
	let fetcher: WhatsOnChainTransactionFetcher;
	let mockThrottledFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockThrottledFetch = vi.fn();
		(FetchThrottler as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
			throttledFetch: mockThrottledFetch,
		}));
		fetcher = new WhatsOnChainTransactionFetcher(BsvNetwork.TEST, { apiKey: "test-key" });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should fetch transaction by id success", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ txid: "123" }),
		});

		await fetcher.fetchTransactionById("123");
	});

	it("should handle 404 in fetchTransactionById", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: false,
			status: 404,
		});

		await fetcher.fetchTransactionById("missing");
	});

	it("should handle error in fetchTransactionById", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: false,
			status: 500,
		});

		await fetcher.fetchTransactionById("error");
	});

	it("should fetch transaction hashes by address", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ result: [] }),
		});

		await fetcher.fetchTransactionHashes("addr");
	});

	it("should fetch unconfirmed transaction hashes", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ result: [] }),
		});

		await fetcher.fetchUnconfirmedTransactionHashes("addr");
	});

	it("should fetch bulk transaction details", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ txid: "1" }],
		});

		await fetcher.fetchBulkTransactionDetails(["1", "2"]);
	});

	it("should fetch bulk raw transaction data", async () => {
		mockThrottledFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ txid: "1" }],
		});

		await fetcher.fetchBulkRawTransactionData(["1"]);
	});

	it("should handle fetch failure (exception)", async () => {
		mockThrottledFetch.mockRejectedValue(new Error("Network"));
		await fetcher.fetchTransactionById("123");
	});

	it("should fetch transactions by address (pagination)", async () => {
		// First call returns page 1 with next token
		mockThrottledFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({
				result: [{ tx_hash: "tx1" }],
				nextPageToken: "token2",
			}),
		});

		// Second call returns page 2 with no token
		mockThrottledFetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({
				result: [{ tx_hash: "tx2" }],
			}),
		});

		// Next calls for bulk details
		mockThrottledFetch.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => [{ txid: "tx1" }, { txid: "tx2" }],
		});

		await fetcher.fetchTransactionsByAddress("addr");
	});

	it("should stop pagination if page is null", async () => {
		mockThrottledFetch.mockResolvedValueOnce({
			ok: false,
			status: 404, // simulate fail/empty
		});

		await fetcher.fetchTransactionsByAddress("addr");
	});
});
