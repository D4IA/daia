/**
 * Parking Gate Agent
 * Creates parking offers and manages agreements
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import {
  LLMOfferCreationAdapter,
  AgentSigningAdapter,
  type ConversationContext,
  type OfferCreationTrigger,
  parseIncomingMessage,
  formatPubKeyRequest,
  formatPubKeyResponse,
  DaiaMessageType,
  MESSAGE_PREFIX,
} from "@d4ia/langchain";
import {
  type DaiaOfferContent,
  serializeOfferContent,
  DaiaRequirementType,
  AgreementVerifier,
  BsvSignatureVerifier,
  WhatsOnChainAdapter,
} from "@d4ia/proto";

export interface ParkingGateConfig {
  llm: BaseChatModel;
  gateId: string;
  hourlyRate: number; // in satoshis per hour
  privateKey: string; // WIF format
}

export interface ParkingGateContext {
  messages: BaseMessage[];
  gateId: string;
  rates: {
    hourly: number;
  };
}

export enum ParkingGateState {
  Initial = "initial",
  WaitingForPubKey = "waiting_for_pubkey",
  SendingPubKey = "sending_pubkey",
  WaitingForRequest = "waiting_for_request",
  WaitingForResponse = "waiting_for_response",
  Accepted = "accepted",
  Rejected = "rejected",
  Done = "done",
}

export class ParkingGateAgent {
  private llm: BaseChatModel;
  private gateId: string;
  private hourlyRate: number;
  private signingAdapter: AgentSigningAdapter;
  private context: ParkingGateContext;
  private offerCreator: LLMOfferCreationAdapter<ParkingGateContext>;
  private agreementVerifier: AgreementVerifier;
  private state: ParkingGateState = ParkingGateState.Initial;
  private lastOffer: DaiaOfferContent | null = null;
  private remotePubKey: string | null = null;
  private offersSent: number = 0;
  private readonly MAX_OFFERS = 3;

  constructor(config: ParkingGateConfig) {
    this.llm = config.llm;
    this.gateId = config.gateId;
    this.hourlyRate = config.hourlyRate;
    
    // Create signing adapter with private key
    this.signingAdapter = new AgentSigningAdapter(config.privateKey);
    
    this.context = {
      messages: [],
      gateId: config.gateId,
      rates: {
        hourly: config.hourlyRate,
      },
    };

    // Create offer creator with custom system prompt
    // Use the gate's public key for signature requirements
    this.offerCreator = new LLMOfferCreationAdapter<ParkingGateContext>({
      llm: this.llm,
      defaultPaymentAddress: "",  // No payment required
      defaultPubKey: "", // Will be set to remote car's public key
      systemPrompt: `You are a parking gate agent creating parking offers. Your rate is ${config.hourlyRate} satoshis per hour of parking.

Guidelines:
- Calculate total price as: rate × duration in hours
- Example: For 2 hours at ${config.hourlyRate} satoshis/hour = ${config.hourlyRate * 2} satoshis total
- For now, only require signature (NO payment) for parking agreements
- Be clear about terms: state the hourly rate AND the total cost
- Provide exact pricing in the natural language description`,
    });

    // Create agreement verifier
    const blockchainAdapter = new WhatsOnChainAdapter("test"); // testnet
    const signatureVerifier = new BsvSignatureVerifier();
    this.agreementVerifier = new AgreementVerifier(
      blockchainAdapter,
      signatureVerifier
    );
  }

  /**
   * Process incoming message and return response (main conversation loop method)
   */
  async processMessage(incomingMessage: string | null): Promise<string | null> {
    // State: Initial - wait for public key request
    if (this.state === ParkingGateState.Initial && incomingMessage) {
      this.context.messages.push(new HumanMessage(incomingMessage));
      const parsed = parseIncomingMessage(incomingMessage);
      
      if (parsed.type === DaiaMessageType.PubKeyRequest) {
        console.log(`🔑 [Gate ${this.gateId}] Received public key request`);
        console.log(`🔑 [Gate ${this.gateId}] Sending my public key: ${this.signingAdapter.getPublicKey().substring(0, 20)}...`);
        
        const myPubKeyResponse = formatPubKeyResponse({
          publicKey: this.signingAdapter.getPublicKey(),
        });
        this.context.messages.push(new AIMessage(myPubKeyResponse));
        this.state = ParkingGateState.WaitingForPubKey;
        return myPubKeyResponse;
      }
    }

    // State: WaitingForPubKey - receive car's public key
    if (this.state === ParkingGateState.WaitingForPubKey && incomingMessage) {
      this.context.messages.push(new HumanMessage(incomingMessage));
      const parsed = parseIncomingMessage(incomingMessage);
      
      if (parsed.type === DaiaMessageType.PubKeyResponse) {
        this.remotePubKey = parsed.response.publicKey;
        console.log(`🔑 [Gate ${this.gateId}] Received car public key: ${this.remotePubKey.substring(0, 20)}...`);
        console.log(`✅ [Gate ${this.gateId}] Key exchange complete. Ready for parking requests.`);
        this.state = ParkingGateState.WaitingForRequest;
        return null; // Wait for parking request
      }
    }

    // State: WaitingForRequest - wait for parking request
    if (this.state === ParkingGateState.WaitingForRequest && incomingMessage) {
      this.context.messages.push(new HumanMessage(incomingMessage));
      console.log(`🚧 [Gate ${this.gateId}] Received: ${incomingMessage}`);
      
      // Parse to check if it's a parking request
      const parsed = parseIncomingMessage(incomingMessage);
      
      if (parsed.type === DaiaMessageType.Natural) {
        // Check if we've hit the offer limit
        if (this.offersSent >= this.MAX_OFFERS) {
          console.log(
            `❌ [Gate ${this.gateId}] Maximum offers (${this.MAX_OFFERS}) already sent. Rejecting.`
          );
          const rejectionMessage = `I'm sorry, but I've already sent ${this.MAX_OFFERS} offers. I cannot make another offer.`;
          this.context.messages.push(new AIMessage(rejectionMessage));
          this.state = ParkingGateState.Rejected;
          return rejectionMessage;
        }

        // Create an offer
        console.log(
          `🤔 [Gate ${this.gateId}] Creating offer for request: ${incomingMessage}`
        );

        // Update default pub key to car's public key
        if (this.remotePubKey) {
          this.offerCreator = new LLMOfferCreationAdapter<ParkingGateContext>({
            llm: this.llm,
            defaultPaymentAddress: "",  // No payment required
            defaultPubKey: this.remotePubKey,
            systemPrompt: `You are a parking gate agent creating parking offers. Your rate is ${this.hourlyRate} satoshis per hour of parking.

Guidelines:
- Calculate total price as: rate × duration in hours
- Example: For 2 hours at ${this.hourlyRate} satoshis/hour = ${this.hourlyRate * 2} satoshis total
- For now, only require signature (NO payment) for parking agreements
- Be clear about terms: state the hourly rate AND the total cost
- Provide exact pricing in the natural language description`,
          });
        }

        const offer = await this.offerCreator.createOffer(
          {
            userRequest: incomingMessage,
            conversationContext: {},
          },
          this.context
        );

        this.lastOffer = offer;
        this.offersSent++;

        console.log(
          `📝 [Gate ${this.gateId}] Created offer ${this.offersSent}/${this.MAX_OFFERS}: ${offer.naturalLanguageOfferContent}`
        );
        console.log(
          `   Requirements: ${offer.requirements.size} requirement(s)`
        );

        // Log requirements details
        for (const [id, req] of offer.requirements.entries()) {
          if (req.type === DaiaRequirementType.Payment) {
            console.log(
              `   - ${id}: Payment to ${req.to}${req.txId ? ` (${req.txId})` : " (self-paid)"}`
            );
          } else if (req.type === DaiaRequirementType.Sign) {
            console.log(`   - ${id}: Signature required (pubKey: ${req.pubKey.substring(0, 20)}...)`);
          }
        }

        // Send the offer
        const serialized = serializeOfferContent(offer);
        const offerMessage = `${MESSAGE_PREFIX.OFFER}${serialized}`;
        this.context.messages.push(new AIMessage(offerMessage));
        console.log(`🚧 [Gate ${this.gateId}] Sending offer to car...`);
        
        this.state = ParkingGateState.WaitingForResponse;
        return offerMessage;
      }
      
      return null;
    }

    // State: WaitingForResponse - process acceptance or rejection
    if (this.state === ParkingGateState.WaitingForResponse && incomingMessage) {
      this.context.messages.push(new HumanMessage(incomingMessage));
      console.log(`🚧 [Gate ${this.gateId}] Received response: ${incomingMessage}`);
      
      const parsed = parseIncomingMessage(incomingMessage);

      // Check if it's a signed agreement
      if (parsed.type === DaiaMessageType.Agreement) {
        console.log(`📝 [Gate ${this.gateId}] Received signed agreement. Verifying...`);

        try {
          // Verify the agreement
          await this.agreementVerifier.verify({
            agreement: parsed.agreement,
          });

          console.log(`✅ [Gate ${this.gateId}] Agreement verification passed!`);
          console.log(`✨ [Gate ${this.gateId}] Agreement accepted!`);
          console.log(`🚧✅ [Gate ${this.gateId}] Gate is opening! Car may enter.`);
          
          this.state = ParkingGateState.Accepted;
          return null; // End conversation
        } catch (error) {
          console.log(`❌ [Gate ${this.gateId}] Agreement verification failed: ${error}`);
          console.log(`🚧🚫 [Gate ${this.gateId}] Gate remains closed.`);
          this.state = ParkingGateState.Rejected;
          return null; // End conversation
        }
      }
      
      // Check for rejection message
      const lowerMessage = incomingMessage.toLowerCase();
      if (lowerMessage.includes("cannot") || lowerMessage.includes("reject")) {
        // Rejected - go back to waiting for request (if under offer limit)
        console.log(`❌ [Gate ${this.gateId}] Offer was rejected by car.`);
        
        if (this.offersSent >= this.MAX_OFFERS) {
          console.log(`🚧🚫 [Gate ${this.gateId}] Maximum offers reached. Gate remains closed.`);
          this.state = ParkingGateState.Rejected;
          return null;
        }
        
        console.log(`🔄 [Gate ${this.gateId}] Ready for new parking request (${this.offersSent}/${this.MAX_OFFERS} offers used).`);
        this.state = ParkingGateState.WaitingForRequest;
        return null;
      }
      
      return null;
    }

    // State: Accepted or Rejected - finalize
    if (this.state === ParkingGateState.Accepted || this.state === ParkingGateState.Rejected) {
      this.state = ParkingGateState.Done;
      return null;
    }

    // State: Done - no more messages
    return null;
  }

  /**
   * Check if the conversation is done
   */
  isDone(): boolean {
    return this.state === ParkingGateState.Done;
  }

  /**
   * Get current state
   */
  getState(): ParkingGateState {
    return this.state;
  }

  /**
   * Get the conversation context
   */
  getContext(): ConversationContext<ParkingGateContext> {
    return this.context;
  }

  /**
   * Get the public key
   */
  getPublicKey(): string {
    return this.signingAdapter.getPublicKey();
  }
}
