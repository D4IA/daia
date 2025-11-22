/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

// Magic strings for special message types (from agents/common/messages.ts)
export const OFFER_REQUEST_MAGIC = '#@#@#__REQUEST_OFFER__#@#@#';
export const JSON_CONTENT_MAGIC = '#@#@#JSONf5b695bd-8188-4557-8ff0-d9ac5f4fc2de#@#@#';
export const REQUEST_PAYMENT_DATA_MAGIC = '#@#@#__PAYMENT_INSTRUCTION__#@#@#';
export const PAYMENT_CONFIRMATION_MAGIC = '#@#@#__PAYMENT_CONFIRMATION__#@#@#';

// Protocol offer message schema
export const ProtocolOfferSchema = z.object({
    type: z.literal('protocol_offer'),
    protocol: z.string(),
    description: z.string().nullable().optional(),
    capabilities: z.array(z.string()).nullable().optional(),
});

// Protocol response message schema
export const ProtocolResponseSchema = z.object({
    type: z.literal('protocol_response'),
    protocol: z.string(),
    accepted: z.boolean(),
    reason: z.string().nullable().optional(),
});

// Parking offer schema
export const ParkingOfferSchema = z.object({
    pricePerHour: z.number().positive(),
    description: z.string().nullable().optional(),
});

// Offer response schema
export const OfferResponseSchema = z.object({
    accepted: z.boolean(),
    reason: z.string().nullable().optional(),
});

// Payment instruction schema
export const PaymentInstructionSchema = z.object({
    address: z.string(),
    amount: z.number().positive(),
});

// Payment confirmation schema
export const PaymentConfirmationSchema = z.object({
    paymentInstruction: PaymentInstructionSchema,
    signature: z.string(),
    timestamp: z.number().optional(),
});

export type ProtocolOffer = z.infer<typeof ProtocolOfferSchema>;
export type ProtocolResponse = z.infer<typeof ProtocolResponseSchema>;
export type ParkingOffer = z.infer<typeof ParkingOfferSchema>;
export type OfferResponse = z.infer<typeof OfferResponseSchema>;
export type PaymentInstruction = z.infer<typeof PaymentInstructionSchema>;
export type PaymentConfirmation = z.infer<typeof PaymentConfirmationSchema>;

export enum ProtocolMessageType {
    PROTOCOL_OFFER = 'protocol_offer',
    PROTOCOL_RESPONSE = 'protocol_response',
    PARKING_OFFER = 'parking_offer',
    OFFER_RESPONSE = 'offer_response',
    OFFER_REQUEST = 'offer_request',
    PAYMENT_INSTRUCTION = 'payment_instruction',
    PAYMENT_CONFIRMATION = 'payment_confirmation',
    REGULAR_MESSAGE = 'regular_message'
}

export interface ParsedProtocolMessage {
    type: ProtocolMessageType;
    originalContent: string;
    data?: any;
    error?: string;
}

export function parseProtocolMessage(content: string): ParsedProtocolMessage {
    // Check for offer request magic
    if (content === OFFER_REQUEST_MAGIC) {
        return {
            type: ProtocolMessageType.OFFER_REQUEST,
            originalContent: content,
        };
    }

    // Check for payment instruction magic
    if (content.startsWith(REQUEST_PAYMENT_DATA_MAGIC)) {
        const jsonContent = content.substring(REQUEST_PAYMENT_DATA_MAGIC.length);
        
        // Handle special case: empty JSON content means it's a request for payment instruction
        if (jsonContent.length === 0) {
            return {
                type: ProtocolMessageType.PAYMENT_INSTRUCTION,
                originalContent: content,
                data: null, // null indicates this is a payment instruction request
            };
        }
        
        try {
            const data = PaymentInstructionSchema.parse(JSON.parse(jsonContent));
            return {
                type: ProtocolMessageType.PAYMENT_INSTRUCTION,
                originalContent: content,
                data,
            };
        } catch (error) {
            return {
                type: ProtocolMessageType.PAYMENT_INSTRUCTION,
                originalContent: content,
                error: error instanceof Error ? error.message : 'Parse error',
            };
        }
    }

    // Check for payment confirmation magic
    if (content.startsWith(PAYMENT_CONFIRMATION_MAGIC)) {
        try {
            const jsonContent = content.substring(PAYMENT_CONFIRMATION_MAGIC.length);
            const data = PaymentConfirmationSchema.parse(JSON.parse(jsonContent));
            return {
                type: ProtocolMessageType.PAYMENT_CONFIRMATION,
                originalContent: content,
                data,
            };
        } catch (error) {
            return {
                type: ProtocolMessageType.PAYMENT_CONFIRMATION,
                originalContent: content,
                error: error instanceof Error ? error.message : 'Parse error',
            };
        }
    }

    // Helper function to parse JSON and try different protocol types
    const tryParseAsProtocolMessage = (jsonStr: string): ParsedProtocolMessage | null => {
        try {
            const parsed = JSON.parse(jsonStr);

            // Try to parse as protocol offer (has type field)
            if (parsed.type === 'protocol_offer') {
                try {
                    const protocolOffer = ProtocolOfferSchema.parse(parsed);
                    return {
                        type: ProtocolMessageType.PROTOCOL_OFFER,
                        originalContent: content,
                        data: protocolOffer,
                    };
                } catch (error) {
                    return {
                        type: ProtocolMessageType.PROTOCOL_OFFER,
                        originalContent: content,
                        error: error instanceof Error ? error.message : 'Protocol offer parse error',
                    };
                }
            }

            // Try to parse as protocol response (has type field)
            if (parsed.type === 'protocol_response') {
                try {
                    const protocolResponse = ProtocolResponseSchema.parse(parsed);
                    return {
                        type: ProtocolMessageType.PROTOCOL_RESPONSE,
                        originalContent: content,
                        data: protocolResponse,
                    };
                } catch (error) {
                    return {
                        type: ProtocolMessageType.PROTOCOL_RESPONSE,
                        originalContent: content,
                        error: error instanceof Error ? error.message : 'Protocol response parse error',
                    };
                }
            }

            // Try to parse as parking offer (has pricePerHour field)
            if (typeof parsed.pricePerHour === 'number') {
                try {
                    const parkingOffer = ParkingOfferSchema.parse(parsed);
                    return {
                        type: ProtocolMessageType.PARKING_OFFER,
                        originalContent: content,
                        data: parkingOffer,
                    };
                } catch (error) {
                    return {
                        type: ProtocolMessageType.PARKING_OFFER,
                        originalContent: content,
                        error: error instanceof Error ? error.message : 'Parking offer parse error',
                    };
                }
            }

            // Try to parse as offer response (has accepted field but no type field)
            if (typeof parsed.accepted === 'boolean' && !parsed.type) {
                try {
                    const offerResponse = OfferResponseSchema.parse(parsed);
                    return {
                        type: ProtocolMessageType.OFFER_RESPONSE,
                        originalContent: content,
                        data: offerResponse,
                    };
                } catch (error) {
                    return {
                        type: ProtocolMessageType.OFFER_RESPONSE,
                        originalContent: content,
                        error: error instanceof Error ? error.message : 'Offer response parse error',
                    };
                }
            }

            // Try to parse as payment confirmation (has paymentInstruction and signature fields)
            if (parsed.paymentInstruction && parsed.signature) {
                try {
                    const paymentConfirmation = PaymentConfirmationSchema.parse(parsed);
                    return {
                        type: ProtocolMessageType.PAYMENT_CONFIRMATION,
                        originalContent: content,
                        data: paymentConfirmation,
                    };
                } catch (error) {
                    return {
                        type: ProtocolMessageType.PAYMENT_CONFIRMATION,
                        originalContent: content,
                        error: error instanceof Error ? error.message : 'Payment confirmation parse error',
                    };
                }
            }

            return null; // Not a recognized protocol message
        } catch {
            return null; // Not valid JSON
        }
    };

    // Check for JSON content magic
    if (content.startsWith(JSON_CONTENT_MAGIC)) {
        const jsonContent = content.substring(JSON_CONTENT_MAGIC.length);
        const protocolResult = tryParseAsProtocolMessage(jsonContent);
        
        if (protocolResult) {
            return protocolResult;
        }

        // If not a recognized protocol message, treat as regular JSON
        try {
            const parsed = JSON.parse(jsonContent);
            return {
                type: ProtocolMessageType.REGULAR_MESSAGE,
                originalContent: content,
                data: parsed,
            };
        } catch (error) {
            return {
                type: ProtocolMessageType.REGULAR_MESSAGE,
                originalContent: content,
                error: error instanceof Error ? error.message : 'JSON parse error',
            };
        }
    }

    // Check if content is plain JSON (without magic prefix) that could be a protocol message
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        const protocolResult = tryParseAsProtocolMessage(content);
        if (protocolResult) {
            return protocolResult;
        }
    }

    // Regular message
    return {
        type: ProtocolMessageType.REGULAR_MESSAGE,
        originalContent: content,
    };
}
