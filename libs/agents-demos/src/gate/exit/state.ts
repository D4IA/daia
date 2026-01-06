import { DaiaLanggraphStateSchema, makeInitialDaiaLanggraphState } from "@d4ia/langchain";
import z from "zod/v3";
import { MessageSchema } from "../../common/schemas";

export const GateExitAgentOutputSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("reject-client"),
	}),
	z.object({
		type: z.literal("accept-client"),
	}),
	z.object({
		type: z.literal("response"),
		response: z.string(),
	}),
]);

export const GateExitAgentOfferDataSchema = z.object({
	paymentAmount: z.number(),
});

export type GateExitAgentOfferData = z.infer<typeof GateExitAgentOfferDataSchema>;
export const convertGateExitOfferToString = (data: GateExitAgentOfferData): string => {
	return `Payment of ${data.paymentAmount} satoshis is required for parking services.`;
};

export const GateExitAgentStateSchema = z.object({
	input: z.string(),
	output: GateExitAgentOutputSchema,

	conversationHistory: z.array(MessageSchema),

	daia: DaiaLanggraphStateSchema,

	isCarAuthenticatedToLeave: z.boolean(),
});

export type GateExitAgentState = z.infer<typeof GateExitAgentStateSchema>;
export const initialGateExitAgentState: GateExitAgentState = {
	input: "",
	output: {
		type: "response",
		response: "",
	},
	conversationHistory: [],
	daia: makeInitialDaiaLanggraphState(),

	isCarAuthenticatedToLeave: false,
};
