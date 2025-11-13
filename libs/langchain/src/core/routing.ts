import { parseIncomingMessage } from "../utils/messageParser";
import { DaiaMessageType, ChainInput } from "../types/schemas";

/**
 * Core routing primitives for DAIA message handling
 * These are building blocks that applications use to build their chains
 */

/**
 * Message type detector for use in routing conditions
 */
export const isOfferMessage = (input: ChainInput): boolean => {
  return parseIncomingMessage(input.message).type === DaiaMessageType.Offer;
};

export const isResponseMessage = (input: ChainInput): boolean => {
  return parseIncomingMessage(input.message).type === DaiaMessageType.Response;
};

export const isAgreementMessage = (input: ChainInput): boolean => {
  return parseIncomingMessage(input.message).type === DaiaMessageType.Agreement;
};

export const isNaturalMessage = (input: ChainInput): boolean => {
  return parseIncomingMessage(input.message).type === DaiaMessageType.Natural;
};

/**
 * Message type router helpers
 */
export const routingHelpers = {
  isOffer: isOfferMessage,
  isResponse: isResponseMessage,
  isAgreement: isAgreementMessage,
  isNatural: isNaturalMessage,
  parseMessage: parseIncomingMessage,
} as const;
