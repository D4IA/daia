import { DaiaAgreementVerifier } from "@daia/core";
import { Message } from "../../car";
import { PublicKey } from "@daia/blockchain";
import { GateAgentCarsDB } from "../state/db";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod/v3";

export type GateAgentConversationResponse = {
    type: "text",
    text: string
} | {
    type: "offer",
    offer: string
}

export type GateAgentOfferData = {
    ratePerHour: number
}

export const convertGateOfferToString = (data: GateAgentOfferData): string => {
    return `Parking services are offered at a rate of ${data.ratePerHour} satoshis per hour.`
}

export interface GateAgentEnterAdapter {
    getPublicKey(): PublicKey;
    getVerifier(): DaiaAgreementVerifier
    getCarsDB(): GateAgentCarsDB
    readLicensePlate(): Promise<string>;

    finalizeCar(result: "let-in" | "reject"): Promise<void>

    runConversation(
        conversationHistory: ReadonlyArray<Message>,
        userMessage: string,
    ): Promise<GateAgentConversationResponse>;

    runConversationTextOnly(
        conversationHistory: ReadonlyArray<Message>,
        userMessage: string,
    ): Promise<string>;

    makeAnOffer(
        conversationHistory: ReadonlyArray<Message>,
    ): Promise<GateAgentOfferData>
}

export class GateAgentEnterAdapterImpl implements GateAgentEnterAdapter {
    constructor(
        private readonly db: GateAgentCarsDB,
        private readonly publicKey: PublicKey,
        private readonly verifier: DaiaAgreementVerifier,
        private readonly licensePlate: string,
        private readonly openAIApiKey: string,
        private readonly conversingModel: string,
        private readonly conversingPrompt: string,
        private readonly offerGenerationModel: string,
        private readonly offerGenerationPrompt: string,
        private readonly finalizeCarCallback: (result: "let-in" | "reject") => Promise<void>
    ) {}

    getPublicKey(): PublicKey {
        return this.publicKey;
    }

    getVerifier(): DaiaAgreementVerifier {
        return this.verifier;
    }

    getCarsDB(): GateAgentCarsDB {
        return this.db;
    }

    async readLicensePlate(): Promise<string> {
        return this.licensePlate;
    }

    async finalizeCar(result: "let-in" | "reject"): Promise<void> {
        await this.finalizeCarCallback(result);
    }

    async runConversation(
        conversationHistory: ReadonlyArray<Message>,
        userMessage: string,
    ): Promise<GateAgentConversationResponse> {
        const ConversationResponseSchema = z.discriminatedUnion("type", [
            z.object({
                type: z.literal("text"),
                text: z.string().describe("The conversational response text"),
            }),
            z.object({
                type: z.literal("offer"),
                shouldMakeOffer: z.literal(true),
            }),
        ]);

        const llm = new ChatOpenAI({
            model: this.conversingModel,
            apiKey: this.openAIApiKey,
        }).withStructuredOutput(ConversationResponseSchema);

        const prompt = [
            { role: "system", content: this.conversingPrompt },
            ...conversationHistory,
            { role: "user" as const, content: userMessage },
        ];

        const response: z.infer<typeof ConversationResponseSchema> = await llm.invoke(
            prompt.map((msg) => ({ role: msg.role, content: msg.content })),
        );

        if (response.type === "offer") {
            const offerData = await this.makeAnOffer(conversationHistory);
            return {
                type: "offer",
                offer: JSON.stringify(offerData),
            };
        }

        return response;
    }

    async runConversationTextOnly(
        conversationHistory: ReadonlyArray<Message>,
        userMessage: string,
    ): Promise<string> {
        const response = await this.runConversation(conversationHistory, userMessage);
        if (response.type === "text") {
            return response.text;
        }
        return convertGateOfferToString(JSON.parse(response.offer) as GateAgentOfferData);
    }

    async makeAnOffer(
        conversationHistory: ReadonlyArray<Message>,
    ): Promise<GateAgentOfferData> {
        const OfferDataSchema = z.object({
            ratePerHour: z.number().describe("The parking rate in satoshis per hour"),
        });

        const llm = new ChatOpenAI({
            model: this.offerGenerationModel,
            apiKey: this.openAIApiKey,
        }).withStructuredOutput(OfferDataSchema);

        const prompt = [
            { role: "system", content: this.offerGenerationPrompt },
            ...conversationHistory,
        ];

        const offerData: z.infer<typeof OfferDataSchema> = await llm.invoke(
            prompt.map((msg) => ({ role: msg.role, content: msg.content })),
        );

        return offerData;
    }
}