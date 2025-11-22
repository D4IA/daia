import { Conn } from './conn';
import { MessageQueue } from './messageQueue';

export class MockConn implements Conn {
	private sendQueue: MessageQueue<string>;
	private receiveQueue: MessageQueue<string>;
	private isClosed: boolean = false;

	private constructor(
		sendQueue: MessageQueue<string>,
		receiveQueue: MessageQueue<string>,
	) {
		this.sendQueue = sendQueue;
		this.receiveQueue = receiveQueue;
	}

	/**
	 * Creates a pair of connected MockConn instances
	 * Messages sent by conn1 are received by conn2 and vice versa
	 */
	static createPair(): [MockConn, MockConn] {
		const queue1to2 = new MessageQueue<string>();
		const queue2to1 = new MessageQueue<string>();

		const conn1 = new MockConn(queue1to2, queue2to1);
		const conn2 = new MockConn(queue2to1, queue1to2);

		return [conn1, conn2];
	}

	async send(message: string): Promise<void> {
		if (this.isClosed || this.sendQueue.isQueueClosed()) {
			throw new Error('Connection is closed');
		}

		this.sendQueue.put(message);
	}

	async receive(): Promise<string> {
		if (this.isClosed) {
			throw new Error('Connection is closed');
		}

		try {
			return await this.receiveQueue.get();
		} catch (error) {
			if (this.receiveQueue.isQueueClosed()) {
				this.isClosed = true;
				throw new Error('Connection is closed');
			}
			throw error;
		}
	}

	async close(): Promise<void> {
		if (this.isClosed) {
			return;
		}

		this.isClosed = true;

		// Close both queues to signal connection termination
		this.sendQueue.close(new Error('Connection closed'));
		this.receiveQueue.close(new Error('Connection closed'));
	}
}
