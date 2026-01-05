import { WhatsOnChainTransactionFetcher, BsvNetwork, type FetcherConfig } from "@d4ia/blockchain-bridge";
import { BsvTransactionParser } from "@d4ia/blockchain-bridge";

const network = process.env.BSV_NETWORK === "test" ? BsvNetwork.TEST : BsvNetwork.MAIN;

const config: FetcherConfig = {
  apiKey: process.env.BSV_API_KEY,
  rps: Number(process.env.BSV_RPS) || undefined,
};

/**
 * Configured transaction fetcher instance for this application.
 * Uses environment variables for network and API key configuration.
 */
export const transactionFetcher = new WhatsOnChainTransactionFetcher(network, config);
export const parser = new BsvTransactionParser(network);