import { Socket } from 'socket.io-client';
import { MessageQueue } from './messageQueue';
import type { Conn } from './conn';
import { MessageType, SocketMessage } from '../../socket/message';

export interface IoConnConfig {
	emitRole: MessageType.CAR | MessageType.GATE;
	acceptRole: MessageType.CAR | MessageType.GATE;
	sessionId: string;
	remoteClientId: string
}

export class IoConn implements Conn {
	private readonly socket: Socket;
	private readonly messageQueue;
	private readonly config: IoConnConfig;
	private isClosed: boolean = false;
	private isRemoteClosed: boolean = false;

	constructor(socket: Socket, config: IoConnConfig) {
		this.socket = socket;
		this.config = config;
		this.messageQueue = new MessageQueue<string>();

		this.socket.on('message', this.handleMessage);
		this.socket.on('error', this.handleError);
	}

	private readonly handleMessage = (data: SocketMessage) => {
		if (
			(data.role === MessageType.SESSION_CLOSE && data.sessionId === this.config.sessionId) ||
			(data.role === MessageType.CLIENT_DISCONNECT && data.clientId === this.config.remoteClientId)
		) {
			this.isClosed = true;
			this.isRemoteClosed = true;
			this.cleanup()
			return;
		} else if (data.role === this.config.acceptRole && 'sessionId' in data && data.sessionId === this.config.sessionId) {
			this.messageQueue.put(data.content);
		}
	}


	private readonly handleError = (error: string) => {
		this.messageQueue.close(new Error(error));
	};

	public readonly send = async (message: string): Promise<void> => {
		if (this.isClosed) {
			throw new Error('Connection is closed');
		}

		const socketMessage: SocketMessage = {
			role: this.config.emitRole,
			sessionId: this.config.sessionId,
			content: message
		};
		this.socket.emit('message', socketMessage);
	};

	public readonly receive = async (): Promise<string> => {
		return await this.messageQueue.get();
	};

	private readonly cleanup = () => {
		this.messageQueue.close(new Error('Connection closed'));

		// Remove socket event listeners
		this.socket.off('message', this.handleMessage);
		this.socket.off('error', this.handleError);
	}

	public readonly close = async (): Promise<void> => {
		if (this.isClosed) {
			return;
		}

		this.isClosed = true;
		this.cleanup()

		// Only send close message if not closed by remote
		if (!this.isRemoteClosed) {
			this.socket.emit('message', {
				role: MessageType.SESSION_CLOSE,
				sessionId: this.config.sessionId,
			} satisfies SocketMessage);
		}
	};
}
