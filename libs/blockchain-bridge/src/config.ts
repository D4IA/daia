import {DEFAULT_REQUESTS_PER_SECOND} from "#src/constants/requests"
import { type NetworkType, NETWORK_TYPES } from "#src/constants/networkType";

/**
 * Configuration interface for the Blockchain Bridge library.
 * Controls interaction with the WhatsOnChain API.
 */
export interface BridgeConfig {
  /**
   * API Key for WhatsOnChain authentication.
   * Providing an API key allows for higher rate limits (e.g., 20 RPS).
   * The key is sent in the `Authorization` header.
   */
  apiKey?: string;

  /**
   * Requests Per Second (RPS) limit for the internal throttler.
   *
   * This controls how many requests are sent to the API per second to avoid hitting rate limits (HTTP 429).
   * - Default public limit: 3 RPS.
   * - With API Key: typically 10, 20, or 40 RPS depending on the plan.
   *
   * @default 3
   */
  rps?: number;

  /**
   * The blockchain network to connect to.
   * - 'main': The main Bitcoin SV network.
   * - 'test': The test network.
   * 
   * @default 'main'
   */
  network: NetworkType;
}

/**
 * Internal configuration state.
 * Initialized with safe defaults for the public API (no key, low RPS).
 * Modified via `configureBridge`.
 */
let config: BridgeConfig = {
  apiKey: undefined,
  rps: DEFAULT_REQUESTS_PER_SECOND,
  network: NETWORK_TYPES.MAINNET,
};

/**
 * Configures the bridge with the provided settings.
 * This should be called at the application startup.
 *
 * @param newConfig - The configuration object.
 */
export const configureBridge = (newConfig: Partial<BridgeConfig>) => {
  config = { ...config, ...newConfig };
};

/**
 * Retrieves the current bridge configuration.
 *
 * @returns The current configuration object.
 */
export const getBridgeConfig = () => config;
