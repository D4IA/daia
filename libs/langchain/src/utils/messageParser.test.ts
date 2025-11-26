import { describe, it, expect } from "vitest";
import { parseIncomingMessage } from "./messageParser";
import { DaiaMessageType, MESSAGE_PREFIX } from "../types/schemas";
import { serializeOfferContent, type DaiaOfferContent, DaiaRequirementType } from "@d4ia/proto";

describe("MessageParser", () => {
  it("should parse natural language messages", () => {
    const result = parseIncomingMessage("Hello, how are you?");
    expect(result.type).toBe(DaiaMessageType.Natural);
    expect(result.content).toBe("Hello, how are you?");
  });

  it("should parse offer messages", () => {
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Test offer",
      requirements: new Map(),
    };
    const serialized = serializeOfferContent(offerContent);
    const message = `${MESSAGE_PREFIX.OFFER}${serialized}`;
    
    const result = parseIncomingMessage(message);
    expect(result.type).toBe(DaiaMessageType.Offer);
    if (result.type === DaiaMessageType.Offer) {
      expect(result.offer).toBeDefined();
    }
  });

  it("should parse response messages", () => {
    const responseData = {
      offerId: "test-id",
      accepted: true,
      message: "I accept",
    };
    const message = `${MESSAGE_PREFIX.RESPONSE}${JSON.stringify(responseData)}`;
    
    const result = parseIncomingMessage(message);
    expect(result.type).toBe(DaiaMessageType.Response);
    if (result.type === DaiaMessageType.Response) {
      expect(result.response).toBeDefined();
      expect(result.response.accepted).toBe(true);
    }
  });
});
