// fetchThrottler.ts
// Utility to throttle fetch requests to max N per interval

import { getBridgeConfig } from "#src/config";
import { DEFAULT_REQUESTS_PER_SECOND } from "#src/constants/requests";

const SECOND_IN_MS = 1000;

/**
 * Singleton class to throttle fetch requests.
 * Ensures that the number of requests does not exceed a specified limit per interval.
 */
export class FetchThrottler {
  private static instance: FetchThrottler;
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private readonly maxRequests: number;
  private readonly intervalMs: number;

  private constructor(
    maxRequests: number,
    intervalMs: number = SECOND_IN_MS
  ) {
    this.maxRequests = maxRequests;
    this.intervalMs = intervalMs;
    setInterval(() => this.release(), this.intervalMs);
  }

  /**
   * Returns the singleton instance of FetchThrottler.
   * Initializes the instance with configuration from `getBridgeConfig` if not already created.
   *
   * @param maxRequests - Optional override for max requests per interval.
   * @param intervalMs - Interval in milliseconds (default: 1000ms).
   */
  public static getInstance(
    maxRequests?: number,
    intervalMs: number = SECOND_IN_MS
  ): FetchThrottler {
    if (!FetchThrottler.instance) {
      const configRps = getBridgeConfig().rps || DEFAULT_REQUESTS_PER_SECOND;
      FetchThrottler.instance = new FetchThrottler(maxRequests ?? configRps, intervalMs);
    }
    return FetchThrottler.instance;
  }

  private release() {
    this.activeCount = 0;
    this.processQueue();
  }

  private processQueue() {
    while (this.activeCount < this.maxRequests && this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        this.activeCount++;
        fn();
      }
    }
  }

  /**
   * Performs a fetch request respecting the rate limit.
   * If the limit is reached, the request is queued until the next interval.
   *
   * @param input - The resource URL or Request object.
   * @param init - Optional configuration for the request.
   * @returns A Promise resolving to the Response.
   */
  public throttledFetch(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const task = () => {
        fetch(input, init).then(resolve).catch(reject);
      };
      this.queue.push(task);
      this.processQueue();
    });
  }
}
