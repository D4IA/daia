import { describe, it, expect, vi } from "vitest";
import { LLMOfferCreationAdapter, LLMOfferValidationAdapter, MockAgreementAdapter } from "./llmAdapters";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult } from "@langchain/core/outputs";
import { DaiaRequirementType } from "@d4ia/proto";
import { RunnableLambda } from "@langchain/core/runnables";

/**
 * Mock LLM for testing
 * This properly implements the withStructuredOutput pattern used by LangChain
 */
class SimpleMockLLM extends BaseChatModel {
  public mockResponse: any;

  constructor(mockResponse?: any) {
    super({});
    this.mockResponse = mockResponse || {};
  }

  _llmType(): string {
    return "mock";
  }

  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    return {
      generations: [
        {
          text: JSON.stringify(this.mockResponse),
          message: new AIMessage(JSON.stringify(this.mockResponse)),
        },
      ],
      llmOutput: {},
    };
  }

  withStructuredOutput(schema: any): RunnableLambda<any, any> {
    // Return a RunnableLambda that when invoked, returns the mockResponse
    const self = this;
    return RunnableLambda.from(async (input: any) => {
      return self.mockResponse;
    });
  }

  setMockResponse(response: any) {
    this.mockResponse = response;
  }
}

describe("LLMOfferCreationAdapter", () => {
  it("should create offer with conversation context", async () => {
    const mockLLM = new SimpleMockLLM({
      description: "Parking for 2 hours - $10",
      requiresSignature: false,
      requiresPayment: true,
      paymentAmount: 1000,
      paymentAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    });

    const adapter = new LLMOfferCreationAdapter({
      llm: mockLLM,
      defaultPaymentAddress: "default-address",
    });

    const context = {
      messages: [
        new HumanMessage("I need parking"),
        new AIMessage("How long do you need it?"),
        new HumanMessage("2 hours"),
      ],
    };

    const offer = await adapter.createOffer(
      {
        userRequest: "I need parking for 2 hours",
        conversationContext: {},
      },
      context
    );

    expect(offer.naturalLanguageOfferContent).toBe("Parking for 2 hours - $10");
    expect(offer.requirements.size).toBe(1);
    expect(offer.requirements.has("payment-1")).toBe(true);

    const paymentReq = offer.requirements.get("payment-1");
    expect(paymentReq?.type).toBe(DaiaRequirementType.Payment);
  });

  it("should create offer with signature requirement", async () => {
    const mockLLM = new SimpleMockLLM({
      description: "Car rental agreement",
      requiresSignature: true,
      requiresPayment: false,
    });

    const adapter = new LLMOfferCreationAdapter({
      llm: mockLLM,
      defaultPubKey: "test-pubkey",
    });

    const offer = await adapter.createOffer(
      { userRequest: "I want to rent a car" },
      { messages: [] }
    );

    expect(offer.requirements.has("signature-1")).toBe(true);
    const sigReq = offer.requirements.get("signature-1");
    expect(sigReq?.type).toBe(DaiaRequirementType.Sign);
    if (sigReq?.type === DaiaRequirementType.Sign) {
      expect(sigReq.pubKey).toBe("test-pubkey");
    }
  });

  it("should use custom context extractor", async () => {
    let extractedContext = "";

    const mockLLM = new SimpleMockLLM({
      description: "Custom offer",
      requiresSignature: false,
      requiresPayment: false,
    });

    const adapter = new LLMOfferCreationAdapter({
      llm: mockLLM,
      contextExtractor: (context: any) => {
        extractedContext = `Custom: ${context.customField}`;
        return extractedContext;
      },
    });

    await adapter.createOffer(
      { userRequest: "test" },
      { customField: "test-value" } as any
    );

    expect(extractedContext).toBe("Custom: test-value");
  });
});

describe("LLMOfferValidationAdapter", () => {
  it("should validate offer with conversation context", async () => {
    const mockLLM = new SimpleMockLLM({
      accepted: true,
      reasoning: "Fair price based on conversation",
      concerns: [],
    });

    const adapter = new LLMOfferValidationAdapter({
      llm: mockLLM,
    });

    const context = {
      messages: [
        new HumanMessage("I need parking for 2 hours"),
        new AIMessage("I can offer parking for $10"),
      ],
    };

    const validation = await adapter.validateOffer(
      {
        naturalLanguageOfferContent: "Parking for 2 hours - $10",
        requirements: new Map(),
      },
      context
    );

    expect(validation.accepted).toBe(true);
    expect(validation.reasoning).toContain("Fair");
  });

  it("should reject unfair offers", async () => {
    const mockLLM = new SimpleMockLLM({
      accepted: false,
      reasoning: "Price is too high compared to discussion",
      concerns: ["Excessive price"],
    });

    const adapter = new LLMOfferValidationAdapter({
      llm: mockLLM,
    });

    const validation = await adapter.validateOffer(
      {
        naturalLanguageOfferContent: "Parking - $1000",
        requirements: new Map(),
      },
      { messages: [] }
    );

    expect(validation.accepted).toBe(false);
    expect(validation.reasoning).toContain("too high");
    expect(validation.concerns).toContain("Excessive price");
  });

  it("should use custom validation criteria", async () => {
    const mockLLM = new SimpleMockLLM({
      accepted: true,
      reasoning: "Meets all criteria",
      concerns: [],
    });

    const customCriteria = [
      "Must be under $20",
      "Must include insurance",
      "Must be available immediately",
    ];

    const adapter = new LLMOfferValidationAdapter({
      llm: mockLLM,
      validationCriteria: customCriteria,
    });

    const validation = await adapter.validateOffer(
      {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map(),
      },
      { messages: [] }
    );

    expect(validation.accepted).toBe(true);
  });

  it("should use custom context extractor", async () => {
    let extractedContext = "";

    const mockLLM = new SimpleMockLLM({
      accepted: true,
      reasoning: "OK",
      concerns: [],
    });

    const adapter = new LLMOfferValidationAdapter({
      llm: mockLLM,
      contextExtractor: (context: any) => {
        extractedContext = `Session: ${context.sessionId}`;
        return extractedContext;
      },
    });

    await adapter.validateOffer(
      {
        naturalLanguageOfferContent: "Test",
        requirements: new Map(),
      },
      { sessionId: "test-session" } as any
    );

    expect(extractedContext).toBe("Session: test-session");
  });
});
