import type { Conn } from './conn';

export interface CallbackConnConfig {
	onSend?: (message: string) => void;
	onReceive?: (message: string) => void;
	onError?: (error: Error) => void;
	onClose?: () => void;
}

export class CallbackConn implements Conn {
	private readonly conn: Conn;
	private readonly config: CallbackConnConfig;

	constructor(conn: Conn, config: CallbackConnConfig = {}) {
		this.conn = conn;
		this.config = config;
	}

	public readonly send = async (message: string): Promise<void> => {
		try {
			this.config.onSend?.(message);
			await this.conn.send(message);
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.config.onError?.(err);
			throw error;
		}
	};

	public readonly receive = async (): Promise<string> => {
		try {
			const message = await this.conn.receive();
			this.config.onReceive?.(message);
			return message;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.config.onError?.(err);
			throw error;
		}
	};

	public readonly close = async (): Promise<void> => {
		try {
			await this.conn.close();
			this.config.onClose?.();
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.config.onError?.(err);
			throw error;
		}
	};
}