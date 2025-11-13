import { MESSAGE_PREFIX, DaiaMessageType, OfferResponse, PubKeyRequest, PubKeyResponse } from "../types/schemas";
import { deserializeOfferContent, DaiaAgreementSchema } from "@d4ia/proto";
import type { DaiaOfferContent, DaiaAgreement } from "@d4ia/proto";

/**
 * Parsed message union type
 */
export type ParsedMessage =
  | {
      type: DaiaMessageType.Natural;
      content: string;
    }
  | {
      type: DaiaMessageType.Offer;
      content: string;
      offer: DaiaOfferContent;
    }
  | {
      type: DaiaMessageType.Response;
      content: string;
      response: OfferResponse;
    }
  | {
      type: DaiaMessageType.Agreement;
      content: string;
      agreement: DaiaAgreement;
    }
  | {
      type: DaiaMessageType.PubKeyRequest;
      content: string;
      request: PubKeyRequest;
    }
  | {
      type: DaiaMessageType.PubKeyResponse;
      content: string;
      response: PubKeyResponse;
    };

/**
 * Parse an incoming message to determine its type and extract content
 */
export function parseIncomingMessage(message: string): ParsedMessage {
  // Check for offer
  if (message.startsWith(MESSAGE_PREFIX.OFFER)) {
    const serializedOffer = message.slice(MESSAGE_PREFIX.OFFER.length);
    try {
      const offer = deserializeOfferContent(serializedOffer);
      return {
        type: DaiaMessageType.Offer,
        content: serializedOffer,
        offer,
      };
    } catch (error) {
      throw new Error(`Failed to parse offer: ${error}`);
    }
  }

  // Check for response
  if (message.startsWith(MESSAGE_PREFIX.RESPONSE)) {
    const serializedResponse = message.slice(MESSAGE_PREFIX.RESPONSE.length);
    try {
      const response = JSON.parse(serializedResponse);
      return {
        type: DaiaMessageType.Response,
        content: serializedResponse,
        response,
      };
    } catch (error) {
      throw new Error(`Failed to parse response: ${error}`);
    }
  }

  // Check for agreement
  if (message.startsWith(MESSAGE_PREFIX.AGREEMENT)) {
    const serializedAgreement = message.slice(MESSAGE_PREFIX.AGREEMENT.length);
    try {
      const agreementData = JSON.parse(serializedAgreement);
      // Convert plain object maps to Map objects
      const agreement = DaiaAgreementSchema.parse({
        offerContentSerialized: agreementData.offerContentSerialized,
        proofs: new Map(Object.entries(agreementData.proofs || {})),
      });
      return {
        type: DaiaMessageType.Agreement,
        content: serializedAgreement,
        agreement,
      };
    } catch (error) {
      throw new Error(`Failed to parse agreement: ${error}`);
    }
  }

  // Check for public key request
  if (message.startsWith(MESSAGE_PREFIX.PUBKEY_REQUEST)) {
    const serializedRequest = message.slice(MESSAGE_PREFIX.PUBKEY_REQUEST.length);
    try {
      const request = serializedRequest ? JSON.parse(serializedRequest) : {};
      return {
        type: DaiaMessageType.PubKeyRequest,
        content: serializedRequest,
        request,
      };
    } catch (error) {
      throw new Error(`Failed to parse public key request: ${error}`);
    }
  }

  // Check for public key response
  if (message.startsWith(MESSAGE_PREFIX.PUBKEY_RESPONSE)) {
    const serializedResponse = message.slice(MESSAGE_PREFIX.PUBKEY_RESPONSE.length);
    try {
      const response = JSON.parse(serializedResponse);
      return {
        type: DaiaMessageType.PubKeyResponse,
        content: serializedResponse,
        response,
      };
    } catch (error) {
      throw new Error(`Failed to parse public key response: ${error}`);
    }
  }

  // Natural language message
  return {
    type: DaiaMessageType.Natural,
    content: message,
  };
}

/**
 * Format an offer for sending (add prefix)
 */
export function formatOfferMessage(serializedOffer: string): string {
  return `${MESSAGE_PREFIX.OFFER}${serializedOffer}`;
}

/**
 * Format a response for sending (add prefix)
 */
export function formatResponseMessage(response: OfferResponse): string {
  return `${MESSAGE_PREFIX.RESPONSE}${JSON.stringify(response)}`;
}

/**
 * Format an agreement for sending (add prefix)
 */
export function formatAgreementMessage(agreement: DaiaAgreement): string {
  // Convert Map to plain object for serialization
  const serializable = {
    offerContentSerialized: agreement.offerContentSerialized,
    proofs: Object.fromEntries(agreement.proofs || new Map()),
  };
  return `${MESSAGE_PREFIX.AGREEMENT}${JSON.stringify(serializable)}`;
}

/**
 * Format a public key request for sending (add prefix)
 */
export function formatPubKeyRequest(request: PubKeyRequest = {}): string {
  return `${MESSAGE_PREFIX.PUBKEY_REQUEST}${JSON.stringify(request)}`;
}

/**
 * Format a public key response for sending (add prefix)
 */
export function formatPubKeyResponse(response: PubKeyResponse): string {
  return `${MESSAGE_PREFIX.PUBKEY_RESPONSE}${JSON.stringify(response)}`;
}
