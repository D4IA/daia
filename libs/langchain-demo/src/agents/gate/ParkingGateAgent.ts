import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { PrivateKey } from "@bsv/sdk";
import {
  LLMOfferCreationAdapter,
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
import {
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
  
  private pubKeyChain;
  private offerChain;
  private agreementChain;
  
  private state: ParkingGateState = ParkingGateState.Initial;
  private remotePubKey: string | null = null;
  private currentOffer: any = null;
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

    this.offerCreator = new LLMOfferCreationAdapter<ParkingGateContext>({
      llm: this.llm,
      defaultPaymentAddress: "",
      defaultPubKey: "",
      systemPrompt: this.buildOfferCreationPrompt(),
    });

    const blockchainAdapter = new WhatsOnChainAdapter("test");
    const signatureVerifier = new BsvSignatureVerifier();
    this.agreementVerifier = new AgreementVerifier(
      blockchainAdapter,
      signatureVerifier
    );

    this.pubKeyChain = createPubKeyExchangeChain({
      signingAdapter: this.signingAdapter,
      requestId: this.gateId,
    });

    this.offerChain = createOfferNegotiationChain({
      offerCreator: this.offerCreator,
      maxOffers: MAX_OFFERS_TO_SEND,
    });

    this.agreementChain = createAgreementChain({
      verifier: this.agreementVerifier,
    });
  }

  async processMessage(incomingMessage: string | null): Promise<string | null> {
    if (!incomingMessage) return null;

    this.context.messages.push(new HumanMessage(incomingMessage));
    const parsed = parseIncomingMessage(incomingMessage);

    if (this.state === ParkingGateState.Initial) {
      return this.handlePubKeyExchange(incomingMessage);
    }

    if (this.state === ParkingGateState.WaitingForPubKey) {
      return this.handlePubKeyExchange(incomingMessage);
    }

    if (this.state === ParkingGateState.WaitingForRequest) {
      if (parsed.type === DaiaMessageType.Natural) {
        return await this.handleParkingRequest(incomingMessage);
      }
      return null;
    }

    if (this.state === ParkingGateState.WaitingForResponse) {
      return await this.handleResponse(incomingMessage);
    }

    if (this.state === ParkingGateState.Accepted || this.state === ParkingGateState.Rejected) {
      this.state = ParkingGateState.Done;
      return null;
    }

    return null;
  }

  private async handlePubKeyExchange(incomingMessage: string): Promise<string | null> {
    const input: PubKeyExchangeInput = {
      message: incomingMessage,
      role: "responder",
    };

    const result: PubKeyExchangeOutput = await this.pubKeyChain.invoke(input);

    if (result.error) {
      console.error(`[Gate ${this.gateId}] PubKey exchange error: ${result.error}`);
      return null;
    }

    if (result.outgoingMessage) {
      this.context.messages.push(new AIMessage(result.outgoingMessage));
      
      if (this.state === ParkingGateState.Initial) {
        console.log(` [Gate ${this.gateId}] Received public key request`);
        console.log(` [Gate ${this.gateId}] Sending my public key: ${this.signingAdapter.getPublicKey().substring(0, 20)}...`);
        this.state = ParkingGateState.WaitingForPubKey;
      }
      
      return result.outgoingMessage;
    }

    if (result.remotePubKey) {
      this.remotePubKey = result.remotePubKey;
      this.context.remotePublicKey = this.remotePubKey;
      console.log(`[Gate ${this.gateId}] Received car public key: ${this.remotePubKey.substring(0, 20)}...`);
      
      this.offerCreator = new LLMOfferCreationAdapter<ParkingGateContext>({
        llm: this.llm,
        defaultPaymentAddress: "",
        defaultPubKey: this.remotePubKey,
        systemPrompt: this.buildOfferCreationPrompt(),
      });
      
      this.offerChain = createOfferNegotiationChain({
        offerCreator: this.offerCreator,
        maxOffers: MAX_OFFERS_TO_SEND,
      });
    }

    if (result.isComplete) {
      console.log(` [Gate ${this.gateId}] Key exchange complete. Ready for parking requests.`);
      this.state = ParkingGateState.WaitingForRequest;
    }

    return null;
  }

  private async handleParkingRequest(incomingMessage: string): Promise<string | null> {
    console.log(`[Gate ${this.gateId}] Received: ${incomingMessage}`);
    
    if (this.offersSent >= MAX_OFFERS_TO_SEND) {
      console.log(` [Gate ${this.gateId}] Maximum offers (${MAX_OFFERS_TO_SEND}) already sent. Rejecting.`);
      const rejectionMessage = `I'm sorry, but I've already sent ${MAX_OFFERS_TO_SEND} offers. I cannot make another offer.`;
      this.context.messages.push(new AIMessage(rejectionMessage));
      this.state = ParkingGateState.Rejected;
      return rejectionMessage;
    }

    console.log(`[Gate ${this.gateId}] Creating offer for request: ${incomingMessage}`);

    const input: OfferNegotiationInput = {
      message: incomingMessage,
      role: "offerer",
      context: this.context,
    };

    const result: OfferNegotiationOutput = await this.offerChain.invoke(input);

    if (result.error) {
      console.error(`[Gate ${this.gateId}] Offer creation error: ${result.error}`);
      return null;
    }

    if (result.offer && result.outgoingMessage) {
      this.currentOffer = result.offer;
      this.offersSent = result.offerCount;
      this.context.offersSent.push({
        offer: result.offer,
        sentAt: new Date(),
      });

      const { min, max, preferred } = this.context.rates;
      console.log(`[Gate ${this.gateId}] Created offer #${this.offersSent}/${MAX_OFFERS_TO_SEND}`);
      console.log(`   Natural language: ${result.offer.naturalLanguageOfferContent}`);
      console.log(`   Rate range: ${min}-${max} sat/hr (preferred: ${preferred} sat/hr)`);
      console.log(`   Requirements: ${result.offer.requirements.size} requirement(s)`);

      for (const [id, req] of result.offer.requirements.entries()) {
        if (req.type === DaiaRequirementType.Payment) {
          console.log(
            `   - ${id}: Payment to ${req.to}${req.txId ? ` (${req.txId})` : " (self-paid)"}`
          );
        } else if (req.type === DaiaRequirementType.Sign) {
          console.log(`   - ${id}: Signature required (pubKey: ${req.pubKey.substring(0, 20)}...)`);
        }
      }

      this.context.messages.push(new AIMessage(result.outgoingMessage));
      console.log(` [Gate ${this.gateId}] Sending offer to car...`);
      this.state = ParkingGateState.WaitingForResponse;
      
      return result.outgoingMessage;
    }

    return null;
  }

  private async handleResponse(incomingMessage: string): Promise<string | null> {
    console.log(`[Gate ${this.gateId}] Received response: ${incomingMessage}`);
    
    const parsed = parseIncomingMessage(incomingMessage);

    if (parsed.type === DaiaMessageType.Agreement) {
      console.log(`[Gate ${this.gateId}] Received signed agreement. Verifying...`);

      const input: AgreementInput = {
        message: incomingMessage,
        role: "verifier",
      };

      const result: AgreementOutput = await this.agreementChain.invoke(input);

      if (result.agreement) {
        logAgreementDetails(this.gateId, result.agreement, this.currentOffer || undefined);
      }

      if (result.isVerified) {
        console.log(`[Gate ${this.gateId}] Agreement verification passed!`);
        console.log(`[Gate ${this.gateId}] Agreement accepted!`);
        
        if (result.agreement) {
          const privateKey = PrivateKey.fromWif(this.privateKeyWif);
          const testnetAddress = privateKey.toPublicKey().toAddress("testnet");
          
          const publishResult = await publishAgreementToBlockchain(
            result.agreement,
            privateKey,
            testnetAddress,
            "testnet"
          );

          if (publishResult.success) {
            console.log(`[Gate ${this.gateId}] Gate is opening! Car may enter.`);
          } else {
            console.log(`[Gate ${this.gateId}] Agreement accepted but blockchain publication failed`);
            console.log(`[Gate ${this.gateId}] Gate is opening anyway (agreement is valid).`);
          }
        }
        
        this.state = ParkingGateState.Accepted;
        return null;
      } else {
        console.log(`[Gate ${this.gateId}] Agreement verification failed: ${result.error}`);
        console.log(`[Gate ${this.gateId}] Gate remains closed.`);
        this.state = ParkingGateState.Rejected;
        return null;
      }
    }
    
    const lowerMessage = incomingMessage.toLowerCase();
    if (lowerMessage.includes("cannot") || lowerMessage.includes("reject")) {
      console.log(` [Gate ${this.gateId}] Offer was rejected by car.`);
      
      if (this.offersSent >= MAX_OFFERS_TO_SEND) {
        console.log(` [Gate ${this.gateId}] Maximum offers reached. Gate remains closed.`);
        this.state = ParkingGateState.Rejected;
        return null;
      }
      
      console.log(` [Gate ${this.gateId}] Ready for new parking request (${this.offersSent}/${MAX_OFFERS_TO_SEND} offers used).`);
      this.state = ParkingGateState.WaitingForRequest;
      return null;
    }
    
    return null;
  }

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

  isDone(): boolean {
    return this.state === ParkingGateState.Done;
  }

  getState(): ParkingGateState {
    return this.state;
  }

  getContext(): ParkingGateContext {
    return this.context;
  }

  getPublicKey(): string {
    return this.signingAdapter.getPublicKey();
  }
}
