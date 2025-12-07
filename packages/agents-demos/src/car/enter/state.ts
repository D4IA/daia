import z from "zod/v3";
import { MessageSchema } from "../../common/schemas";
import { DaiaLanggraphStateSchema, makeInitialDaiaLanggraphState } from "@daia/langchain";

export const CarEnterAgentStateSchema = z.object({
	input: z.string(),
	output: z.string(),

	conversationHistory: z.array(MessageSchema).default([]),

	daia: DaiaLanggraphStateSchema,
});

export type CarEnterAgentState = z.infer<typeof CarEnterAgentStateSchema>;

export const initialCarEnterAgentState: CarEnterAgentState = {
	input: "",
	output: "",
	conversationHistory: [],
	daia: makeInitialDaiaLanggraphState(),
};
