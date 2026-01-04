import {DEFAULT_REQUESTS_PER_SECOND} from "./fetcherConfig";

const SECOND_IN_MS = 1000;

/**
 * Rate limiter for fetch requests.
 * Ensures that the number of requests does not exceed a specified limit per interval.
 * @param maxRequests - Max requests per interval (default: 3).
 * @param intervalMs - Interval in milliseconds (default: 1000ms).
 */
export class FetchThrottler {
	private queue: Array<() => void> = [];
	private activeCount = 0;

	constructor(
		private readonly maxRequests: number = DEFAULT_REQUESTS_PER_SECOND,
		private readonly intervalMs: number = SECOND_IN_MS,
	) {
		setInterval(() => this.release(), this.intervalMs);
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
	 */
	throttledFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
		return new Promise((resolve, reject) => {
			const task = () => {
				fetch(input, init).then(resolve).catch(reject);
			};
			this.queue.push(task);
			this.processQueue();
		});
	}
}
