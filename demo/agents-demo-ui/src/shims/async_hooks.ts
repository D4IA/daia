// Browser shim for node:async_hooks
// This provides a minimal implementation for browser environments

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AsyncLocalStorage<T = any> {
	private store: T | undefined;

	getStore(): T | undefined {
		return this.store;
	}

	run<R>(store: T, callback: () => R): R {
		const previousStore = this.store;
		this.store = store;
		try {
			const result = callback();
			// Check if result is a Promise
			if (result instanceof Promise) {
				// For async callbacks, maintain context throughout the promise chain
				return result.finally(() => {
					this.store = previousStore;
				}) as R;
			}
			// For sync callbacks, restore immediately
			this.store = previousStore;
			return result;
		} catch (error) {
			this.store = previousStore;
			throw error;
		}
	}

	exit<R>(callback: () => R): R {
		const previousStore = this.store;
		this.store = undefined;
		try {
			const result = callback();
			// Check if result is a Promise
			if (result instanceof Promise) {
				// For async callbacks, maintain context throughout the promise chain
				return result.finally(() => {
					this.store = previousStore;
				}) as R;
			}
			// For sync callbacks, restore immediately
			this.store = previousStore;
			return result;
		} catch (error) {
			this.store = previousStore;
			throw error;
		}
	}

	enterWith(store: T): void {
		this.store = store;
	}

	disable(): void {
		this.store = undefined;
	}
}

export default {
	AsyncLocalStorage,
};
