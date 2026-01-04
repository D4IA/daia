import z from "zod/v3";
import { MessageSchema } from "../../common/schemas";
import { DaiaLanggraphStateSchema, makeInitialDaiaLanggraphState } from "@d4ia/langchain";

export const CarExitAgentStateSchema = z.object({
	input: z.string(),
	output: z.string(),

	conversationHistory: z.array(MessageSchema).default([]),

	isAuthenticatedToLeave: z.boolean(),

	daia: DaiaLanggraphStateSchema,
});

export type CarExitAgentState = z.infer<typeof CarExitAgentStateSchema>;

export const initialCarExitAgentState: CarExitAgentState = {
	input: "",
	output: "",
	conversationHistory: [],
	daia: makeInitialDaiaLanggraphState(),

	isAuthenticatedToLeave: false,
};
