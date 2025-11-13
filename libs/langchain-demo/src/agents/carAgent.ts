/**
 * Car Agent
 * Requests parking and validates incoming offers from the parking gate
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import {
  LLMOfferValidationAdapter,
  AgentSigningAdapter,
  type ConversationContext,
  parseIncomingMessage,
  formatPubKeyRequest,
  formatPubKeyResponse,
  formatAgreementMessage,
  DaiaMessageType,
} from "@d4ia/langchain";
import type { DaiaOfferContent, DaiaAgreement } from "@d4ia/proto";
import { DaiaRequirementType } from "@d4ia/proto";

export interface CarAgentConfig {
  llm: BaseChatModel;
  carId: string;
  maxBudget: number; // in satoshis
  parkingDuration: string;
  privateKey: string; // WIF format
}

export interface CarContext {
  messages: BaseMessage[];
  carId: string;
  budget: number;
  parkingDuration: string;
}

export enum CarAgentState {
  Initial = "initial",
  RequestingPubKey = "requesting_pubkey",
  WaitingForPubKey = "waiting_for_pubkey",
  WaitingForOffer = "waiting_for_offer",
  Accepted = "accepted",
  Rejected = "rejected",
  Done = "done",
}

export class CarAgent {
  private llm: BaseChatModel;
  private carId: string;
  private maxBudget: number;
  private context: CarContext;
  private offerValidator: LLMOfferValidationAdapter<CarContext>;
  private signingAdapter: AgentSigningAdapter;
  private state: CarAgentState = CarAgentState.Initial;
  private remotePubKey: string | null = null;
  private offerCount: number = 0;
  private readonly MAX_OFFERS = 3;

  constructor(config: CarAgentConfig) {
    this.llm = config.llm;
    this.carId = config.carId;
    this.maxBudget = config.maxBudget;
    this.context = {
      messages: [],
      carId: config.carId,
      budget: config.maxBudget,
      parkingDuration: config.parkingDuration,
    };

    // Create signing adapter with private key
    this.signingAdapter = new AgentSigningAdapter(config.privateKey);

    // Create offer validator with custom system prompt
    this.offerValidator = new LLMOfferValidationAdapter<CarContext>({
      llm: this.llm,
      systemPrompt: `You are a car agent negotiating parking. Your constraints:
- Maximum budget: ${config.maxBudget} satoshis
- You must evaluate offers based on fairness and budget constraints
- Accept reasonable offers within budget
- Reject offers that exceed budget or seem unfair`,
      validationCriteria: [
        `Price must be under ${config.maxBudget} satoshis`,
        "Terms must be clear and reasonable",
        "Duration should match what was requested",
      ],
    });
  }

  /**
   * Process incoming message and return response (main conversation loop method)
   */
  async processMessage(incomingMessage: string | null): Promise<string | null> {
    // State: Initial - request public key from gate
    if (this.state === CarAgentState.Initial) {
      console.log(`🔑 [Car ${this.carId}] Requesting public key from gate...`);
      const pubKeyRequest = formatPubKeyRequest({ requestId: this.carId });
      this.context.messages.push(new HumanMessage(pubKeyRequest));
      this.state = CarAgentState.WaitingForPubKey;
      return pubKeyRequest;
    }

    // State: WaitingForPubKey - receive gate's public key and send ours
    if (this.state === CarAgentState.WaitingForPubKey && incomingMessage) {
      this.context.messages.push(new AIMessage(incomingMessage));
      const parsed = parseIncomingMessage(incomingMessage);
      
      if (parsed.type === DaiaMessageType.PubKeyResponse) {
        this.remotePubKey = parsed.response.publicKey;
        console.log(`🔑 [Car ${this.carId}] Received gate public key: ${this.remotePubKey.substring(0, 20)}...`);
        console.log(`🔑 [Car ${this.carId}] Sending my public key: ${this.signingAdapter.getPublicKey().substring(0, 20)}...`);
        
        const myPubKeyResponse = formatPubKeyResponse({
          publicKey: this.signingAdapter.getPublicKey(),
        });
        this.context.messages.push(new HumanMessage(myPubKeyResponse));
        this.state = CarAgentState.RequestingPubKey;
        return myPubKeyResponse;
      }
    }

    // State: RequestingPubKey - now send parking request
    if (this.state === CarAgentState.RequestingPubKey) {
      const message = `Hello, I need parking for ${this.context.parkingDuration}. My car ID is ${this.carId}. What are your rates?`;
      this.context.messages.push(new HumanMessage(message));
      console.log(`🚗 [Car ${this.carId}]: ${message}`);
      this.state = CarAgentState.WaitingForOffer;
      return message;
    }

    // State: WaitingForOffer - process incoming offer
    if (this.state === CarAgentState.WaitingForOffer && incomingMessage) {
      this.context.messages.push(new AIMessage(incomingMessage));
      
      // Parse the message
      const parsed = parseIncomingMessage(incomingMessage);
      
      // If it's an offer, validate it
      if (parsed.type === DaiaMessageType.Offer) {
        this.offerCount++;
        console.log(
          `🤔 [Car ${this.carId}] Evaluating offer ${this.offerCount}/${this.MAX_OFFERS}: ${parsed.offer.naturalLanguageOfferContent}`
        );

        // Check if we've exceeded max offers
        if (this.offerCount > this.MAX_OFFERS) {
          console.log(
            `❌ [Car ${this.carId}] Exceeded maximum offers (${this.MAX_OFFERS}). Rejecting.`
          );
          this.state = CarAgentState.Rejected;
          const rejectionMessage = `I cannot accept this offer. I've already received ${this.MAX_OFFERS} offers.`;
          this.context.messages.push(new HumanMessage(rejectionMessage));
          console.log(`🚗 [Car ${this.carId}]: ${rejectionMessage}`);
          return rejectionMessage;
        }

        const validation = await this.offerValidator.validateOffer(
          parsed.offer,
          this.context
        );

        if (validation.accepted) {
          console.log(
            `✅ [Car ${this.carId}] Accepting offer: ${validation.reasoning}`
          );
          
          // Sign the offer to create an agreement
          console.log(`✍️  [Car ${this.carId}] Signing agreement...`);
          const signingResult = await this.signingAdapter.signOffer(parsed.offer);
          
          console.log(`📝 [Car ${this.carId}] Agreement signed with ${signingResult.agreement.proofs.size} proof(s)`);
          
          // Send the agreement
          const agreementMessage = formatAgreementMessage(signingResult.agreement);
          this.context.messages.push(new HumanMessage(agreementMessage));
          console.log(`🚗 [Car ${this.carId}] Sending signed agreement to gate...`);
          
          this.state = CarAgentState.Accepted;
          return agreementMessage;
        } else {
          console.log(
            `❌ [Car ${this.carId}] Rejecting offer: ${validation.reasoning}`
          );
          if (validation.concerns && validation.concerns.length > 0) {
            console.log(
              `⚠️  [Car ${this.carId}] Concerns: ${validation.concerns.join(", ")}`
            );
          }
          
          const rejectionMessage = `I cannot accept this offer. ${validation.reasoning}`;
          this.context.messages.push(new HumanMessage(rejectionMessage));
          console.log(`🚗 [Car ${this.carId}]: ${rejectionMessage}`);
          
          // Continue waiting for next offer (if under limit)
          return rejectionMessage;
        }
      }
      
      // If it's a natural language message, just acknowledge
      console.log(`📨 [Car ${this.carId}] Received: ${incomingMessage}`);
      return null; // Continue waiting
    }

    // State: Accepted - finalize
    if (this.state === CarAgentState.Accepted) {
      console.log(`🚗✨ [Car ${this.carId}] Entering parking lot! Agreement signed.`);
      this.state = CarAgentState.Done;
      return null; // Conversation ends
    }

    // State: Rejected - leave
    if (this.state === CarAgentState.Rejected) {
      console.log(`🚗💨 [Car ${this.carId}] Leaving area. Offer rejected.`);
      this.state = CarAgentState.Done;
      return null; // Conversation ends
    }

    // State: Done - no more messages
    return null;
  }

  /**
   * Check if the conversation is done
   */
  isDone(): boolean {
    return this.state === CarAgentState.Done;
  }

  /**
   * Get current state
   */
  getState(): CarAgentState {
    return this.state;
  }

  /**
   * Get the conversation context
   */
  getContext(): ConversationContext<CarContext> {
    return this.context;
  }

  /**
   * Get the public key
   */
  getPublicKey(): string {
    return this.signingAdapter.getPublicKey();
  }
}
