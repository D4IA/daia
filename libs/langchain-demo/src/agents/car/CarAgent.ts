import { HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  LLMOfferValidationAdapter,
  AgentSigningAdapter,
  parseIncomingMessage,
  DaiaMessageType,
  createPubKeyExchangeChain,
  createOfferNegotiationChain,
  createAgreementChain,
  type PubKeyExchangeInput,
  type PubKeyExchangeOutput,
  type OfferNegotiationInput,
  type OfferNegotiationOutput,
  type AgreementInput,
  type AgreementOutput,
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
  
  private pubKeyChain;
  private offerChain;
  private agreementChain;
  
  private remotePubKey: string | null = null;
  private currentOffer: DaiaOfferContent | null = null;
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

    this.pubKeyChain = createPubKeyExchangeChain({
      signingAdapter: this.signingAdapter,
      requestId: this.carId,
    });

    this.offerChain = createOfferNegotiationChain({
      offerValidator: this.offerValidator,
      maxOffers: MAX_OFFERS_TO_RECEIVE,
    });

    this.agreementChain = createAgreementChain({
      signingAdapter: this.signingAdapter,
    });
  }

  async processMessage(incomingMessage: string | null): Promise<string | null> {
    if (this.state === CarAgentState.Initial) {
      return this.handlePubKeyExchange(null);
    }

    if (!incomingMessage) {
      if (this.state === CarAgentState.RequestingPubKey) {
        return this.handleParkingRequest();
      }
      return null;
    }

    this.context.messages.push(new AIMessage(incomingMessage));
    const parsed = parseIncomingMessage(incomingMessage);

    if (this.state === CarAgentState.WaitingForPubKey) {
      return this.handlePubKeyExchange(incomingMessage);
    }

    if (this.state === CarAgentState.WaitingForOffer) {
      if (parsed.type === DaiaMessageType.Offer) {
        return await this.handleIncomingOffer(incomingMessage);
      }
      console.log(` [Car ${this.carId}] Received: ${incomingMessage}`);
      return null;
    }

    if (this.state === CarAgentState.Accepted || this.state === CarAgentState.Rejected) {
      this.state = CarAgentState.Done;
      return null;
    }

    return null;
  }

  private async handlePubKeyExchange(incomingMessage: string | null): Promise<string | null> {
    const input: PubKeyExchangeInput = {
      message: incomingMessage,
      role: "initiator",
    };

    const result: PubKeyExchangeOutput = await this.pubKeyChain.invoke(input);

    if (result.error) {
      console.error(`[Car ${this.carId}] PubKey exchange error: ${result.error}`);
      return null;
    }

    if (result.outgoingMessage) {
      this.context.messages.push(new HumanMessage(result.outgoingMessage));
      
      if (this.state === CarAgentState.Initial) {
        console.log(` [Car ${this.carId}] Requesting public key from gate...`);
        this.state = CarAgentState.WaitingForPubKey;
      } else if (this.state === CarAgentState.WaitingForPubKey) {
        console.log(` [Car ${this.carId}] Sending my public key: ${this.signingAdapter.getPublicKey().substring(0, 20)}...`);
        // After sending our pubkey, we move to next state
        if (result.remotePubKey) {
          this.remotePubKey = result.remotePubKey;
          console.log(` [Car ${this.carId}] Received gate public key: ${this.remotePubKey.substring(0, 20)}...`);
        }
        if (result.isComplete) {
          console.log(` [Car ${this.carId}] Key exchange complete.`);
          this.state = CarAgentState.RequestingPubKey;
        }
      }
      
      return result.outgoingMessage;
    }

    if (result.remotePubKey && !result.outgoingMessage) {
      this.remotePubKey = result.remotePubKey;
      console.log(` [Car ${this.carId}] Received gate public key: ${this.remotePubKey.substring(0, 20)}...`);
    }

    if (result.isComplete && this.state !== CarAgentState.RequestingPubKey) {
      console.log(` [Car ${this.carId}] Key exchange complete.`);
      this.state = CarAgentState.RequestingPubKey;
    }

    return null;
  }

  private handleParkingRequest(): string {
    const parkingRequest = `I need parking. What is your hourly rate?`;
    console.log(` [Car ${this.carId}] ${parkingRequest}`);

    this.context.messages.push(new HumanMessage(parkingRequest));
    this.state = CarAgentState.WaitingForOffer;
    return parkingRequest;
  }

  private async handleIncomingOffer(incomingMessage: string): Promise<string | null> {
    const parsed = parseIncomingMessage(incomingMessage);
    if (parsed.type !== DaiaMessageType.Offer) return null;

    const offer = parsed.offer;
    this.offerCount++;
    
    console.log(
      `Evaluating offer ${this.offerCount}/${MAX_OFFERS_TO_RECEIVE}: ${offer.naturalLanguageOfferContent}`
    );

    const input: OfferNegotiationInput = {
      message: incomingMessage,
      role: "recipient",
      context: this.context,
      maxOffers: MAX_OFFERS_TO_RECEIVE,
    };

    const result: OfferNegotiationOutput = await this.offerChain.invoke(input);

    if (result.error) {
      console.error(`[Car ${this.carId}] Offer processing error: ${result.error}`);
      return null;
    }

    this.currentOffer = result.offer;

    if (result.accepted) {
      return await this.acceptOffer(offer, result.reasoning || "Offer meets requirements");
    } else if (result.rejected) {
      return this.rejectOffer(result.reasoning || "Offer does not meet requirements");
    }

    return null;
  }

  private async acceptOffer(offer: DaiaOfferContent, reasoning: string): Promise<string> {
    console.log(` [Car ${this.carId}] Accepting offer: ${reasoning}`);
    console.log(`[Car ${this.carId}] Signing agreement...`);

    const input: AgreementInput = {
      offer: offer,
      role: "signer",
    };

    const result: AgreementOutput = await this.agreementChain.invoke(input);

    if (result.error) {
      console.error(`[Car ${this.carId}] Signing error: ${result.error}`);
      return `Sorry, I encountered an error signing the agreement.`;
    }

    if (result.agreement) {
      console.log(`[Car ${this.carId}] Agreement signed with ${result.agreement.proofs.size} proof(s)`);
      
      logAgreementDetails(this.carId, result.agreement, offer);
      
      const blockchainData = prepareForBlockchain(result.agreement);
      logBlockchainReadiness(this.carId, blockchainData);
    }

    this.state = CarAgentState.Accepted;
    return result.outgoingMessage || "";
  }

  private rejectOffer(reasoning: string): string {
    console.log(` [Car ${this.carId}] Rejecting offer: ${reasoning}`);
    
    const rejectionMessage = `I cannot accept this offer. ${reasoning}`;
    this.context.messages.push(new HumanMessage(rejectionMessage));
    console.log(`[Car ${this.carId}]: ${rejectionMessage}`);
    
    if (this.offerCount < MAX_OFFERS_TO_RECEIVE) {
      console.log(` [Car ${this.carId}] Waiting for another offer...`);
    } else {
      this.state = CarAgentState.Rejected;
    }
    
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

export { CarAgentState, type CarAgentConfig, type CarContext };
