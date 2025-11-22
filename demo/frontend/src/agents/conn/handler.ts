import { Conn } from './conn';

/**
 * Handler interface for managing the complete lifecycle of a connection.
 *
 * Implementations are responsible for:
 * - Protocol negotiation
 * - Session initialization and management
 * - Message exchange coordination
 * - Connection cleanup
 *
 * @example
 * ```typescript
 * class MyAgent implements ConnHandler {
 *   async handle(conn: Conn): Promise<void> {
 *     // Negotiate protocol
 *     const protocol = await this.negotiateProtocol(conn);
 *
 *     // Handle session
 *     const session = this.createSession(protocol);
 *     await this.runSession(conn, session);
 *   }
 * }
 * ```
 *
 * @see {@link CarAgent} - Implementation for car agents
 * @see {@link GateAgent} - Implementation for gate agents
 */
export interface ConnHandler {
	/**
	 * Handles the complete connection lifecycle from establishment to closure.
	 *
	 * This method should:
	 * 1. Perform any necessary protocol negotiation
	 * 2. Initialize the appropriate session handler
	 * 3. Manage the message exchange loop
	 * 4. Handle connection termination gracefully
	 *
	 * @param conn - The connection to handle
	 * @throws {Error} When protocol negotiation fails or connection errors occur
	 *
	 * @example
	 * ```typescript
	 * const agent = new CarAgent(controls, config);
	 * await agent.handle(connection);
	 * ```
	 */
	handle: (conn: Conn) => Promise<void>;
}

/**
 * Handler interface for managing individual conversation rounds within a session.
 *
 * This generic interface allows different session types to return different result types
 * while maintaining a consistent pattern for turn-based conversation handling.
 *
 * @template R - The type of result returned by each round handler
 *
 * @example
 * ```typescript
 * class MySession implements RoundHandler<MySessionResult> {
 *   async handleRound(message: string): Promise<MySessionResult> {
 *     // Process the message
 *     const response = await this.processMessage(message);
 *
 *     return {
 *       type: MessageResultType.MESSAGE,
 *       msg: response
 *     };
 *   }
 * }
 * ```
 *
 * @see {@link CarSessionEntry} - Car entry session implementation
 * @see {@link GateSessionEntry} - Gate entry session implementation
 * @see {@link ProtoNegotiatorSession} - Protocol negotiation session implementation
 */
export interface RoundHandler<R> {
	/**
	 * Processes a single message in the conversation and returns the appropriate response.
	 *
	 * The handler should:
	 * - Parse and understand the incoming message
	 * - Update internal state as needed
	 * - Generate an appropriate response
	 * - Determine if the conversation should continue or terminate
	 *
	 * @param message - The incoming message to process
	 * @returns A promise that resolves to a result indicating the response and next action
	 *
	 * @example
	 * ```typescript
	 * const result = await session.handleRound("Hello, I'd like to park");
	 *
	 * if (result.type === MessageResultType.MESSAGE) {
	 *   // Continue conversation
	 *   await conn.send(result.msg);
	 * } else if (result.type === MessageResultType.DONE) {
	 *   // End conversation
	 *   if (result.msg) await conn.send(result.msg);
	 *   break;
	 * }
	 * ```
	 */
	handleRound: (message: string) => Promise<R>;
}
