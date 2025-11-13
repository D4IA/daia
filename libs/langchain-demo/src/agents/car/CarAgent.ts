/**
 * Car Agent - Refactored
 * 
 * Requests parking and validates incoming offers from the parking gate.
 * Protocol: Gate makes offers, Car accepts/rejects
 */

import { HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  LLMOfferValidationAdapter,
  AgentSigningAdapter,
  parseIncomingMessage,
  formatPubKeyRequest,
  formatPubKeyResponse,
  formatAgreementMessage,
  DaiaMessageType,
} from "@d4ia/langchain";
import type { DaiaOfferContent } from "@d4ia/proto";
import {
  type CarAgentConfig,
  createCarSystemPrompt,
  createCarValidationCriteria,
} from "./config";
import {
  CarAgentState,
  type CarContext,
  MAX_OFFERS_TO_RECEIVE,
} from "./types";
import {
  logAgreementDetails,
  prepareForBlockchain,
  logBlockchainReadiness,
} from "../../utils/agreementLogger";

export class CarAgent {
  private llm;
  private carId: string;
  private context: CarContext;
  private offerValidator: LLMOfferValidationAdapter<CarContext>;
  private signingAdapter: AgentSigningAdapter;
  private state: CarAgentState = CarAgentState.Initial;
  private remotePubKey: string | null = null;
  private offerCount: number = 0;

  constructor(config: CarAgentConfig) {
    this.llm = config.llm;
    this.carId = config.carId;
    this.context = {
      messages: [],
      carId: config.carId,
      rates: {
        min: config.minAcceptableRate,
        max: config.maxAcceptableRate,
      },
    };

    this.signingAdapter = new AgentSigningAdapter(config.privateKey);

    this.offerValidator = new LLMOfferValidationAdapter<CarContext>({
      llm: this.llm,
      systemPrompt: createCarSystemPrompt(config.minAcceptableRate, config.maxAcceptableRate),
      validationCriteria: createCarValidationCriteria(config.minAcceptableRate, config.maxAcceptableRate),
    });
  }

  async processMessage(incomingMessage: string | null): Promise<string | null> {
    // State: Initial - request public key from gate
    if (this.state === CarAgentState.Initial) {
      return this.handleInitialState();
    }

    // State: RequestingPubKey - send parking request (doesn't need incoming message)
    if (this.state === CarAgentState.RequestingPubKey) {
      return this.handleParkingRequest();
    }

    if (!incomingMessage) return null;

    // State: WaitingForPubKey - receive gate's public key and send ours
    if (this.state === CarAgentState.WaitingForPubKey) {
      return this.handlePubKeyExchange(incomingMessage);
    }

    // State: WaitingForOffer - process incoming offer
    if (this.state === CarAgentState.WaitingForOffer) {
      return await this.handleIncomingOffer(incomingMessage);
    }

    // State: Accepted - finalize
    if (this.state === CarAgentState.Accepted) {
      console.log(`🚗✨ [Car ${this.carId}] Entering parking lot! Agreement signed.`);
      this.state = CarAgentState.Done;
      return null;
    }

    // State: Rejected - leave
    if (this.state === CarAgentState.Rejected) {
      console.log(`🚗💨 [Car ${this.carId}] Leaving area. Offer rejected.`);
      this.state = CarAgentState.Done;
      return null;
    }

    return null;
  }

  private handleInitialState(): string {
    console.log(`🔑 [Car ${this.carId}] Requesting public key from gate...`);
    const pubKeyRequest = formatPubKeyRequest({ requestId: this.carId });
    this.context.messages.push(new HumanMessage(pubKeyRequest));
    this.state = CarAgentState.WaitingForPubKey;
    return pubKeyRequest;
  }

  private handlePubKeyExchange(incomingMessage: string): string | null {
    this.context.messages.push(new AIMessage(incomingMessage));
    const parsed = parseIncomingMessage(incomingMessage);
    
    if (parsed.type === DaiaMessageType.PubKeyResponse) {
      this.remotePubKey = parsed.response.publicKey;
      console.log(`🔑 [Car ${this.carId}] Received gate public key: ${this.remotePubKey.substring(0, 20)}...`);
      console.log(`🔑 [Car ${this.carId}] Sending my public key: ${this.signingAdapter.getPublicKey().substring(0, 20)}...`);
      console.log(`✅ [Car ${this.carId}] Key exchange complete.`);
      
      const myPubKeyResponse = formatPubKeyResponse({
        publicKey: this.signingAdapter.getPublicKey(),
      });
      this.context.messages.push(new HumanMessage(myPubKeyResponse));
      this.state = CarAgentState.RequestingPubKey;
      return myPubKeyResponse;
    }
    return null;
  }

  private handleParkingRequest(): string {
    const parkingRequest = `I need parking. What is your hourly rate?`;
    console.log(`🚗 [Car ${this.carId}] ${parkingRequest}`);

    this.context.messages.push(new HumanMessage(parkingRequest));
    this.state = CarAgentState.WaitingForOffer;
    return parkingRequest;
  }

  private async handleIncomingOffer(incomingMessage: string): Promise<string | null> {
    this.context.messages.push(new AIMessage(incomingMessage));
    const parsed = parseIncomingMessage(incomingMessage);
    
    if (parsed.type === DaiaMessageType.Offer) {
      return await this.evaluateOffer(parsed.offer);
    }
    
    // Natural language message
    console.log(`📨 [Car ${this.carId}] Received: ${incomingMessage}`);
    return null;
  }

  private async evaluateOffer(offer: DaiaOfferContent): Promise<string | null> {
    this.offerCount++;
    console.log(
      `🤔 [Car ${this.carId}] Evaluating offer ${this.offerCount}/${MAX_OFFERS_TO_RECEIVE}: ${offer.naturalLanguageOfferContent}`
    );

    // Check if exceeded max offers
    if (this.offerCount > MAX_OFFERS_TO_RECEIVE) {
      console.log(`❌ [Car ${this.carId}] Exceeded maximum offers (${MAX_OFFERS_TO_RECEIVE}). Rejecting.`);
      return this.rejectOffer(`I've already received ${MAX_OFFERS_TO_RECEIVE} offers.`);
    }

    const validation = await this.offerValidator.validateOffer(offer, this.context);

    if (validation.accepted) {
      return await this.acceptOffer(offer, validation.reasoning);
    } else {
      return this.rejectOffer(validation.reasoning, validation.concerns);
    }
  }

  private async acceptOffer(offer: DaiaOfferContent, reasoning: string): Promise<string> {
    console.log(`✅ [Car ${this.carId}] Accepting offer: ${reasoning}`);
    
    // Sign the offer
    console.log(`✍️  [Car ${this.carId}] Signing agreement...`);
    const signingResult = await this.signingAdapter.signOffer(offer);
    
    console.log(`📝 [Car ${this.carId}] Agreement signed with ${signingResult.agreement.proofs.size} proof(s)`);
    
    // Log agreement details
    logAgreementDetails(this.carId, signingResult.agreement, offer);
    
    // Prepare for blockchain (future use)
    const blockchainData = prepareForBlockchain(signingResult.agreement);
    logBlockchainReadiness(this.carId, blockchainData);
    
    // Send the agreement
    const agreementMessage = formatAgreementMessage(signingResult.agreement);
    this.context.messages.push(new HumanMessage(agreementMessage));
    console.log(`🚗 [Car ${this.carId}] Sending signed agreement to gate...`);
    
    this.state = CarAgentState.Accepted;
    return agreementMessage;
  }

  private rejectOffer(reasoning: string, concerns?: string[]): string {
    console.log(`❌ [Car ${this.carId}] Rejecting offer: ${reasoning}`);
    if (concerns && concerns.length > 0) {
      console.log(`⚠️  [Car ${this.carId}] Concerns: ${concerns.join(", ")}`);
    }
    
    const rejectionMessage = `I cannot accept this offer. ${reasoning}`;
    this.context.messages.push(new HumanMessage(rejectionMessage));
    console.log(`🚗 [Car ${this.carId}]: ${rejectionMessage}`);
    
    return rejectionMessage;
  }

  isDone(): boolean {
    return this.state === CarAgentState.Done;
  }

  getState(): CarAgentState {
    return this.state;
  }

  getPublicKey(): string {
    return this.signingAdapter.getPublicKey();
  }

  getContext(): CarContext {
    return this.context;
  }
}

// Re-export types for convenience
export { CarAgentState, type CarAgentConfig, type CarContext };
