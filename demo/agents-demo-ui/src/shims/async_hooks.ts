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
			return callback();
		} finally {
			this.store = previousStore;
		}
	}

	exit<R>(callback: () => R): R {
		const previousStore = this.store;
		this.store = undefined;
		try {
			return callback();
		} finally {
			this.store = previousStore;
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
