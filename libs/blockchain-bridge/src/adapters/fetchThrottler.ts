// fetchThrottler.ts
// Utility to throttle fetch requests to max N per interval

import { REQUESTS_PER_SECOND } from "#src/constants/requests";

const SECOND_IN_MS = 1000;

export class FetchThrottler {
  private static instance: FetchThrottler;
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private readonly maxRequests: number;
  private readonly intervalMs: number;

  private constructor(
    maxRequests: number = REQUESTS_PER_SECOND,
    intervalMs: number = SECOND_IN_MS
  ) {
    this.maxRequests = maxRequests;
    this.intervalMs = intervalMs;
    setInterval(() => this.release(), this.intervalMs);
  }

  public static getInstance(
    maxRequests: number = REQUESTS_PER_SECOND,
    intervalMs: number = SECOND_IN_MS
  ): FetchThrottler {
    if (!FetchThrottler.instance) {
      FetchThrottler.instance = new FetchThrottler(maxRequests, intervalMs);
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
