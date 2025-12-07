import { DaiaLanggraphStateSchema, makeInitialDaiaLanggraphState } from "@daia/langchain";
import z from "zod/v3";
import { MessageSchema } from "../../common/schemas";

export const GateEnterAgentOutputSchema = z.discriminatedUnion("type", [
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

export const GateEnterAgentOfferDataSchema = z.object({
	ratePerHour: z.number(),
});

export type GateEnterAgentOfferData = z.infer<typeof GateEnterAgentOfferDataSchema>;
export const convertGateEnterOfferToString = (data: GateEnterAgentOfferData): string => {
	return `Parking services are offered at a rate of ${data.ratePerHour} satoshis per hour.`;
};

export const GateEnterAgentStateSchema = z.object({
	input: z.string(),
	output: GateEnterAgentOutputSchema,

	conversationHistory: z.array(MessageSchema),
	lastOffer: GateEnterAgentOfferDataSchema.nullable(),

	daia: DaiaLanggraphStateSchema,
});

export type GateEnterAgentState = z.infer<typeof GateEnterAgentStateSchema>;
export const initialGateEnterAgentState: GateEnterAgentState = {
	input: "",
	output: {
		type: "response",
		response: "",
	},
	conversationHistory: [],
	lastOffer: null,
	daia: makeInitialDaiaLanggraphState(),
};
