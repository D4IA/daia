import { z } from 'zod';
import { Conn } from './conn';

export class ConnUtil implements Conn {
	private conn: Conn;

	constructor(conn: Conn) {
		this.conn = conn;
	}

	send = async (message: string): Promise<void> => {
		return this.conn.send(message);
	};

	sendJson = async (obj: unknown): Promise<void> => {
		const jsonString = JSON.stringify(obj);
		return this.conn.send(jsonString);
	};

	receive = async (): Promise<string> => {
		return this.conn.receive();
	};

	receiveJson = async (): Promise<unknown> => {
		const message = await this.conn.receive();
		return JSON.parse(message);
	};

	receiveJsonWithSchema = async <T>(schema: z.ZodSchema<T>): Promise<T> => {
		const message = await this.conn.receive();
		const parsed = JSON.parse(message);
		return schema.parse(parsed);
	};

	close = async (): Promise<void> => {
		return this.conn.close();
	};
}
