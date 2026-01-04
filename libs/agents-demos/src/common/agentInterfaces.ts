/**
 * Response from an agent when processing input.
 * Can be either a message to continue conversation or a signal to end connection.
 */
export interface AgentMessageResponse {
	type: "message";
	content: string;
}

export interface AgentEndResponse {
	type: "end";
}

export type AgentResponse = AgentMessageResponse | AgentEndResponse;
