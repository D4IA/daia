import type { DaiaOfferContent } from "@d4ia/proto";
import type { OfferValidation } from "../types/schemas";

/**
 * Generic conversation context type
 * Applications define their own context structure
 */
export type ConversationContext<T = any> = T;

/**
 * Information about why an offer should be created
 */
export interface OfferCreationTrigger {
  userRequest: string;
  conversationContext?: any;
}

/**
 * Adapter for creating offers
 * Takes full conversation context to create contextually appropriate offers
 * 
 * @template T - Application-specific conversation context type
 */
export interface IOfferCreationAdapter<T = any> {
  /**
   * Create an offer based on trigger and conversation context
   * 
   * @param trigger - Information about why the offer should be created
   * @param context - Full conversation context
   * @returns Structured offer content
   */
  createOffer(
    trigger: OfferCreationTrigger,
    context: ConversationContext<T>
  ): Promise<DaiaOfferContent>;
}

/**
 * Adapter for validating incoming offers
 * Takes full conversation context to make informed decisions
 * 
 * @template T - Application-specific conversation context type
 */
export interface IOfferValidationAdapter<T = any> {
  /**
   * Validate an incoming offer with full conversation context
   * 
   * @param offer - The offer to validate
   * @param context - Full conversation context (history, user info, etc.)
   * @returns Structured validation decision with reasoning
   */
  validateOffer(
    offer: DaiaOfferContent,
    context: ConversationContext<T>
  ): Promise<OfferValidation>;
}

/**
 * Adapter for handling agreement creation
 * Application implements the signing/payment logic
 * 
 * @template T - Application-specific conversation context type
 */
export interface IAgreementAdapter<T = any> {
  /**
   * Create an agreement from an accepted offer
   * 
   * @param offer - The accepted offer
   * @param context - Full conversation context
   * @returns Agreement creation result
   */
  createAgreement(
    offer: DaiaOfferContent,
    context: ConversationContext<T>
  ): Promise<{
    success: boolean;
    agreementId?: string;
    error?: string;
  }>;
}
