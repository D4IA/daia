export class MessageQueue<T> {
	private queue: T[] = [];
	private waitingReceivers: Array<(message: T) => void> = [];
	private waitingRejects: Array<(error: Error) => void> = [];
	private isClosed: boolean = false;

	put(message: T): void {
		if (this.isClosed) {
			return;
		}

		// If there are waiting receivers, deliver immediately
		if (this.waitingReceivers.length > 0) {
			const receiver = this.waitingReceivers.shift()!;
			this.waitingRejects.shift(); // Remove corresponding reject handler
			receiver(message);
		} else {
			// Add to queue
			this.queue.push(message);
		}
	}

	get(): Promise<T> {
		if (this.isClosed) {
			return Promise.reject(new Error('Queue is closed'));
		}

		// If there are messages in queue, return immediately
		if (this.queue.length > 0) {
			return Promise.resolve(this.queue.shift()!);
		}

		// Wait for a message
		return new Promise<T>((resolve, reject) => {
			if (this.isClosed) {
				reject(new Error('Queue is closed'));
				return;
			}
			this.waitingReceivers.push(resolve);
			this.waitingRejects.push(reject);
		});
	}

	close(customError?: Error): void {
		this.isClosed = true;
		this.queue = [];

		// Reject all waiting receivers
		const error = customError || new Error('Queue is closed');
		this.waitingRejects.forEach((reject) => reject(error));
		this.waitingReceivers = [];
		this.waitingRejects = [];
	}

	// Utility methods
	size(): number {
		return this.queue.length;
	}

	isQueueClosed(): boolean {
		return this.isClosed;
	}
}
