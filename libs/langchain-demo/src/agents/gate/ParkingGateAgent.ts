/**
 * Parking Gate Agent - Refactored
 * 
 * Manages the gate side of parking negotiations:
 * - Responds to public key requests
 * - Creates parking offers based on min/max/preferred rates
 * - Verifies signed agreements from car agents
 * - Tracks offer history to enforce limits (max 3 offers)
 */

import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { PrivateKey } from "@bsv/sdk";
import {
  LLMOfferCreationAdapter,
  AgentSigningAdapter,
  parseIncomingMessage,
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
import type { ParkingGateConfig } from "./config";
import {
  ParkingGateState,
  type ParkingGateContext,
  MAX_OFFERS_TO_SEND,
} from "./types";
import { logAgreementDetails, publishAgreementToBlockchain } from "../../utils";

export class ParkingGateAgent {
  private llm;
  private gateId: string;
  private privateKeyWif: string;
  private signingAdapter: AgentSigningAdapter;
  private context: ParkingGateContext;
  private offerCreator: LLMOfferCreationAdapter<ParkingGateContext>;
  private agreementVerifier: AgreementVerifier;
  private state: ParkingGateState = ParkingGateState.Initial;
  private lastOffer: DaiaOfferContent | null = null;
  private remotePubKey: string | null = null;
  private offersSent: number = 0;

  constructor(config: ParkingGateConfig) {
    this.llm = config.llm;
    this.gateId = config.gateId;
    this.privateKeyWif = config.privateKey;
    
    this.signingAdapter = new AgentSigningAdapter(config.privateKey);
    
    this.context = {
      messages: [],
      gateId: config.gateId,
      state: ParkingGateState.Initial,
      rates: {
        min: config.minHourlyRate,
        max: config.maxHourlyRate,
        preferred: config.preferredHourlyRate,
      },
      offersSent: [],
      remotePublicKey: null,
    };

    // Create offer creator with custom system prompt
    this.offerCreator = new LLMOfferCreationAdapter<ParkingGateContext>({
      llm: this.llm,
      defaultPaymentAddress: "",
      defaultPubKey: "",
      systemPrompt: this.buildOfferCreationPrompt(),
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
   * Process incoming message and return response
   */
  async processMessage(incomingMessage: string | null): Promise<string | null> {
    // State: Initial - wait for public key request
    if (this.state === ParkingGateState.Initial && incomingMessage) {
      return this.handleInitialState(incomingMessage);
    }

    // State: WaitingForPubKey - receive car's public key
    if (this.state === ParkingGateState.WaitingForPubKey && incomingMessage) {
      return this.handlePubKeyExchange(incomingMessage);
    }

    // State: WaitingForRequest - wait for parking request
    if (this.state === ParkingGateState.WaitingForRequest && incomingMessage) {
      return await this.handleParkingRequest(incomingMessage);
    }

    // State: WaitingForResponse - wait for car's response/agreement
    if (this.state === ParkingGateState.WaitingForResponse && incomingMessage) {
      return await this.handleAgreement(incomingMessage);
    }

    // State: Accepted - finalize
    if (this.state === ParkingGateState.Accepted) {
      console.log(`🚧✅ [Gate ${this.gateId}] Gate opened! Car entering.`);
      this.state = ParkingGateState.Done;
      return null;
    }

    // State: Rejected - finalize
    if (this.state === ParkingGateState.Rejected) {
      console.log(`🚧❌ [Gate ${this.gateId}] Access denied.`);
      this.state = ParkingGateState.Done;
      return null;
    }

    return null;
  }

  /**
   * Handle initial state - respond to public key requests
   */
  private handleInitialState(incomingMessage: string): string {
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

    return "Please request my public key to begin.";
  }

  /**
   * Handle key exchange - store remote public key
   */
  private handlePubKeyExchange(incomingMessage: string): string | null {
    this.context.messages.push(new HumanMessage(incomingMessage));
    const parsed = parseIncomingMessage(incomingMessage);
    
    if (parsed.type === DaiaMessageType.PubKeyResponse) {
      this.remotePubKey = parsed.response.publicKey;
      this.context.remotePublicKey = this.remotePubKey;
      console.log(`🔑 [Gate ${this.gateId}] Received car public key: ${this.remotePubKey.substring(0, 20)}...`);
      console.log(`✅ [Gate ${this.gateId}] Key exchange complete. Ready for parking requests.`);
      this.state = ParkingGateState.WaitingForRequest;
      return null; // Wait for parking request
    }

    return null;
  }

  /**
   * Handle parking request - create and send offer
   */
  private async handleParkingRequest(incomingMessage: string): Promise<string | null> {
    this.context.messages.push(new HumanMessage(incomingMessage));
    console.log(`🚧 [Gate ${this.gateId}] Received: ${incomingMessage}`);
    
    // Parse the message
    const parsed = parseIncomingMessage(incomingMessage);
    
    if (parsed.type === DaiaMessageType.Natural) {
      // Check if we've hit the offer limit
      if (this.offersSent >= MAX_OFFERS_TO_SEND) {
        console.log(
          `❌ [Gate ${this.gateId}] Maximum offers (${MAX_OFFERS_TO_SEND}) already sent. Rejecting.`
        );
        const rejectionMessage = `I'm sorry, but I've already sent ${MAX_OFFERS_TO_SEND} offers. I cannot make another offer.`;
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
          systemPrompt: this.buildOfferCreationPrompt(),
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
      
      // Track in context
      this.context.offersSent.push({
        offer: offer,
        sentAt: new Date(),
      });

      const { min, max, preferred } = this.context.rates;
      console.log(`💰 [Gate ${this.gateId}] Created offer #${this.offersSent}/${MAX_OFFERS_TO_SEND}`);
      console.log(`   Natural language: ${offer.naturalLanguageOfferContent}`);
      console.log(`   Rate range: ${min}-${max} sat/hr (preferred: ${preferred} sat/hr)`);
      console.log(`   Requirements: ${offer.requirements.size} requirement(s)`);

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

  /**
   * Handle agreement - verify signature and respond
   */
  private async handleAgreement(incomingMessage: string): Promise<string | null> {
    this.context.messages.push(new HumanMessage(incomingMessage));
    console.log(`🚧 [Gate ${this.gateId}] Received response: ${incomingMessage}`);
    
    const parsed = parseIncomingMessage(incomingMessage);

    // Check if it's a signed agreement
    if (parsed.type === DaiaMessageType.Agreement) {
      console.log(`📝 [Gate ${this.gateId}] Received signed agreement. Verifying...`);

      // Log agreement details including signatures
      logAgreementDetails(this.gateId, parsed.agreement, this.lastOffer || undefined);

      try {
        // Verify the agreement
        await this.agreementVerifier.verify({
          agreement: parsed.agreement,
        });

        console.log(`✅ [Gate ${this.gateId}] Agreement verification passed!`);
        console.log(`✨ [Gate ${this.gateId}] Agreement accepted!`);
        
        // Publish agreement to blockchain
        const privateKey = PrivateKey.fromWif(this.privateKeyWif);
        const testnetAddress = privateKey.toPublicKey().toAddress("testnet");
        
        const publishResult = await publishAgreementToBlockchain(
          parsed.agreement,
          privateKey,
          testnetAddress,
          "testnet"
        );

        if (publishResult.success) {
          console.log(`🚧✅ [Gate ${this.gateId}] Gate is opening! Car may enter.`);
        } else {
          console.log(`⚠️  [Gate ${this.gateId}] Agreement accepted but blockchain publication failed`);
          console.log(`🚧✅ [Gate ${this.gateId}] Gate is opening anyway (agreement is valid).`);
        }
        
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
      
      if (this.offersSent >= MAX_OFFERS_TO_SEND) {
        console.log(`🚧🚫 [Gate ${this.gateId}] Maximum offers reached. Gate remains closed.`);
        this.state = ParkingGateState.Rejected;
        return null;
      }
      
      console.log(`🔄 [Gate ${this.gateId}] Ready for new parking request (${this.offersSent}/${MAX_OFFERS_TO_SEND} offers used).`);
      this.state = ParkingGateState.WaitingForRequest;
      return null;
    }
    
    return null;
  }

  /**
   * Build system prompt for offer creation
   */
  private buildOfferCreationPrompt(): string {
    const { min, max, preferred } = this.context.rates;

    return `You are a parking gate agent negotiating hourly parking rates for unspecified duration.

Your pricing strategy (KEEP THESE PRIVATE - don't reveal to customer):
- Minimum acceptable: ${min} sat/hour (never go below)
- Maximum: ${max} sat/hour (ceiling rate)
- Preferred target: ${preferred} sat/hour (aim for this)

Negotiation approach:
1. Quote rates near your preferred rate (${preferred} sat/hour)
2. NEVER reveal your minimum (${min}) or maximum (${max}) rates
3. Adjust strategically based on customer responses
4. NEVER go below ${min} sat/hour - reject instead
5. Stay within ${min}-${max} sat/hour range

Offer format:
- Quote as: "X satoshis per hour"
- NO total price calculations (duration unspecified)
- NO terms beyond the hourly rate
- Keep it simple: just the rate

Example: "The rate is ${preferred} satoshis per hour"

CRITICAL REQUIREMENT SETTINGS:
- requiresSignature: true (ALWAYS require customer signature)
- requiresPayment: false (NEVER require payment - signature only)
- This is a signature-based agreement, not a payment transaction

Be strategic - maximize your rate while securing the deal. Guard your minimum!`;
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
  getContext(): ParkingGateContext {
    return this.context;
  }

  /**
   * Get the public key
   */
  getPublicKey(): string {
    return this.signingAdapter.getPublicKey();
  }
}
