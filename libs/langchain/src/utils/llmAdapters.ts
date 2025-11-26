/**
 * LLM-based utility implementations of DAIA adapters
 * 
 * These are UTILITY implementations that applications can use or customize.
 * They use LangChain LLMs with structured output and conversation context.
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { DaiaOfferContent } from "@d4ia/proto";
import { DaiaRequirementType } from "@d4ia/proto";
import type {
  IOfferCreationAdapter,
  IOfferValidationAdapter,
  IAgreementAdapter,
  OfferCreationTrigger,
  ConversationContext,
} from "../adapters/interfaces";
import type { OfferValidation } from "../types/schemas";

/**
 * Default conversation context structure
 * Applications can extend this or use their own
 */
export interface DefaultConversationContext {
  messages: BaseMessage[];
  userInfo?: {
    userId?: string;
    preferences?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * Configuration for LLM-based offer creation
 */
export interface LLMOfferCreationConfig {
  llm: BaseChatModel;
  systemPrompt?: string;
  defaultPaymentAddress?: string;
  defaultPubKey?: string;
  /**
   * Custom function to extract context summary from conversation
   */
  contextExtractor?: (context: any) => string;
}

/**
 * LLM-based offer creation adapter
 * Uses conversation context to create contextually appropriate offers
 */
export class LLMOfferCreationAdapter<T = DefaultConversationContext>
  implements IOfferCreationAdapter<T>
{
  private llm: BaseChatModel;
  private systemPrompt: string;
  private defaultPaymentAddress?: string;
  private defaultPubKey?: string;
  private contextExtractor: (context: any) => string;

  constructor(config: LLMOfferCreationConfig) {
    this.llm = config.llm;
    this.systemPrompt =
      config.systemPrompt ||
      `You are an offer creation specialist. Create detailed, fair offers based on:
- User's current request
- Full conversation history
- Context about the user and situation

Be specific about requirements and pricing.`;
    this.defaultPaymentAddress = config.defaultPaymentAddress;
    this.defaultPubKey = config.defaultPubKey;
    this.contextExtractor =
      config.contextExtractor || this.defaultContextExtractor;
  }

  private defaultContextExtractor(context: any): string {
    if (!context) return "No context available";

    if (context.messages && Array.isArray(context.messages)) {
      return context.messages
        .map((msg: BaseMessage) => {
          const role = msg._getType() === "human" ? "User" : "Assistant";
          return `${role}: ${msg.content}`;
        })
        .join("\n");
    }

    return JSON.stringify(context);
  }

  async createOffer(
    trigger: OfferCreationTrigger,
    context: ConversationContext<T>
  ): Promise<DaiaOfferContent> {
    const contextSummary = this.contextExtractor(context);

    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      [
        "human",
        `Conversation History:
{conversationHistory}

Current User Request: {userRequest}

Additional Context: {additionalContext}

Create an offer that addresses the user's request. Provide:
1. Clear natural language description of the offer
2. Whether a signature is required
3. Whether payment is required
4. If payment required, specify amount in satoshis and address`,
      ],
    ]);

    // Define Zod schema for structured output
    // Note: OpenAI requires all properties to be in 'required' array, so we can't use optional()
    // Instead we provide default values or make fields nullable
    const offerDetailsSchema = z.object({
      description: z.string().describe("Natural language offer description"),
      requiresSignature: z.boolean().describe("Whether signature is required"),
      requiresPayment: z.boolean().describe("Whether payment is required"),
      paymentAmount: z.number().nullable().describe("Payment amount in satoshis if requiresPayment is true, null otherwise"),
      paymentAddress: z.string().nullable().describe("Payment address if payment required, null otherwise"),
    });

    const chain = promptTemplate.pipe(
      this.llm.withStructuredOutput(offerDetailsSchema, {
        name: "OfferDetails",
      })
    );

    const offerDetails: any = await chain.invoke({
      conversationHistory: contextSummary,
      userRequest: trigger.userRequest,
      additionalContext: JSON.stringify(trigger.conversationContext || {}),
    });

    // Build requirements map
    const requirements = new Map();

    if (offerDetails.requiresSignature) {
      requirements.set("signature-1", {
        type: DaiaRequirementType.Sign,
        pubKey: this.defaultPubKey || "placeholder-pubkey",
        offererNonce: Math.random().toString(36).substring(7),
      });
    }

    if (offerDetails.requiresPayment) {
      requirements.set("payment-1", {
        type: DaiaRequirementType.Payment,
        to:
          offerDetails.paymentAddress ||
          this.defaultPaymentAddress ||
          "placeholder-address",
        txId: "", // Self-paid
      });
    }

    return {
      naturalLanguageOfferContent: offerDetails.description,
      requirements,
    };
  }
}

/**
 * Configuration for LLM-based offer validation
 */
export interface LLMOfferValidationConfig {
  llm: BaseChatModel;
  systemPrompt?: string;
  validationCriteria?: string[];
  /**
   * Custom function to extract context summary from conversation
   */
  contextExtractor?: (context: any) => string;
}

/**
 * LLM-based offer validation adapter
 * Uses conversation context to make informed validation decisions
 */
export class LLMOfferValidationAdapter<T = DefaultConversationContext>
  implements IOfferValidationAdapter<T>
{
  private llm: BaseChatModel;
  private systemPrompt: string;
  private validationCriteria: string[];
  private contextExtractor: (context: any) => string;

  constructor(config: LLMOfferValidationConfig) {
    this.llm = config.llm;
    this.systemPrompt =
      config.systemPrompt ||
      `You are an offer validator. Carefully analyze offers considering:
- The full conversation context
- Whether the offer matches what was discussed
- Fairness of terms and pricing
- Clarity and completeness

Be thorough but fair in your assessment.`;
    this.validationCriteria = config.validationCriteria || [
      "Offer matches conversation context",
      "Pricing is reasonable",
      "Terms are clear",
      "No unexpected requirements",
    ];
    this.contextExtractor =
      config.contextExtractor ||
      ((context: any) => {
        if (!context) return "No context available";
        if (context.messages && Array.isArray(context.messages)) {
          return context.messages
            .map((msg: BaseMessage) => {
              const role = msg._getType() === "human" ? "User" : "Assistant";
              return `${role}: ${msg.content}`;
            })
            .join("\n");
        }
        return JSON.stringify(context);
      });
  }

  async validateOffer(
    offer: DaiaOfferContent,
    context: ConversationContext<T>
  ): Promise<OfferValidation> {
    const contextSummary = this.contextExtractor(context);
    const criteriaText = this.validationCriteria.join("\n- ");

    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      [
        "human",
        `Conversation History:
{conversationHistory}

Incoming Offer:
Description: {offerText}
Requirements: {requirements}

Validation Criteria:
- {criteria}

Based on the conversation context and criteria, decide whether to accept or reject this offer.
Provide clear reasoning for your decision and list any concerns.`,
      ],
    ]);

    // Define Zod schema for structured output
    const validationSchema = z.object({
      accepted: z.boolean().describe("Whether to accept the offer"),
      reasoning: z.string().describe("Explanation for the decision"),
      concerns: z.array(z.string()).nullable().describe("Any concerns about the offer, null if none"),
    });

    const chain = promptTemplate.pipe(
      this.llm.withStructuredOutput(validationSchema, {
        name: "OfferValidation",
      })
    );

    const validation: any = await chain.invoke({
      conversationHistory: contextSummary,
      offerText: offer.naturalLanguageOfferContent,
      requirements: JSON.stringify(Array.from(offer.requirements.entries())),
      criteria: criteriaText,
    });

    return {
      accepted: validation.accepted,
      reasoning: validation.reasoning,
      concerns: validation.concerns || [],
    };
  }
}

/**
 * Simple mock agreement adapter for testing/development
 */
export class MockAgreementAdapter<T = any> implements IAgreementAdapter<T> {
  async createAgreement(
    offer: DaiaOfferContent,
    context: ConversationContext<T>
  ): Promise<{ success: boolean; agreementId?: string; error?: string }> {
    // Mock implementation - application should implement actual signing/payment logic
    return {
      success: true,
      agreementId: `agreement-${Date.now()}`,
    };
  }
}
