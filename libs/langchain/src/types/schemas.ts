import { z } from "zod";
// Import types from proto - don't duplicate
export type {
  DaiaOfferContent,
  DaiaAgreement,
  DaiaRequirementType,
  DaiaOfferRequirement,
} from "@d4ia/proto";

/**
 * Message prefixes to distinguish special messages from natural language
 */
export const MESSAGE_PREFIX = {
  OFFER: "DAIA_OFFER:",
  RESPONSE: "DAIA_RESPONSE:",
  AGREEMENT: "DAIA_AGREEMENT:",
  PUBKEY_REQUEST: "DAIA_PUBKEY_REQUEST:",
  PUBKEY_RESPONSE: "DAIA_PUBKEY_RESPONSE:",
} as const;

/**
 * Message types for routing
 */
export enum DaiaMessageType {
  Natural = "natural",
  Offer = "offer",
  Response = "response",
  Agreement = "agreement",
  PubKeyRequest = "pubkey_request",
  PubKeyResponse = "pubkey_response",
}

/**
 * Schema for offer validation decision (LLM structured output)
 */
export const OfferValidationSchema = z.object({
  accepted: z.boolean().describe("Whether the offer is accepted or rejected"),
  reasoning: z.string().describe("Explanation of why the offer was accepted or rejected"),
  concerns: z.array(z.string()).optional().describe("Any concerns or conditions about the offer"),
});

export type OfferValidation = z.infer<typeof OfferValidationSchema>;

/**
 * Schema for offer response (accepting or rejecting)
 */
export const OfferResponseSchema = z.object({
  offerId: z.string().optional().describe("ID of the offer being responded to"),
  accepted: z.boolean().describe("Whether the offer is accepted"),
  message: z.string().optional().describe("Additional message to the offer creator"),
});

export type OfferResponse = z.infer<typeof OfferResponseSchema>;

/**
 * Schema for public key request
 */
export const PubKeyRequestSchema = z.object({
  requestId: z.string().optional().describe("Optional identifier for the request"),
});

export type PubKeyRequest = z.infer<typeof PubKeyRequestSchema>;

/**
 * Schema for public key response
 */
export const PubKeyResponseSchema = z.object({
  publicKey: z.string().describe("The public key in hex or base58 format"),
  address: z.string().optional().describe("Optional address derived from the public key"),
});

export type PubKeyResponse = z.infer<typeof PubKeyResponseSchema>;

/**
 * Chain input/output types (minimal)
 */
export interface ChainInput {
  message: string;
  conversationHistory?: string[];
}

export interface ChainOutput {
  messageType: DaiaMessageType;
  content: string;
  metadata?: Record<string, any>;
}
