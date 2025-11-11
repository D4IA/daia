import { z } from 'zod';

// Define role types for better readability
export enum MessageType {
    GATE = 'gate',
    CAR = 'car',
    CAR_SIGNALING = 'car-signaling',
    GATE_SIGNALING = 'gate-signaling',
    CAR_AWAITS_HANDLING = 'car-awaits-handling',
    SESSION_CLOSE = 'session-close',
    CLIENT_DISCONNECT = 'client-disconnect',
}

// Schema for messages that require content
const MessageWithContentSchema = z.object({
    role: z.enum([
        MessageType.GATE,
        MessageType.CAR,
        MessageType.CAR_SIGNALING,
        MessageType.GATE_SIGNALING,
    ]),
    sessionId: z.string().min(1, 'Session ID is required'),
    content: z.string().min(1, 'Message content is required'),
});

const SessionReadyMessageSchema = z.object({
    role: z.enum([
        MessageType.CAR_AWAITS_HANDLING,
    ]),
    carClientId: z.string(),
    gateClientId: z.string(),
    sessionIdToUse: z.string().min(1, 'Session ID is required'),
});

export const SocketMessageSchema = z.union([
    MessageWithContentSchema,
    SessionReadyMessageSchema,
    z.object({
        role: z.enum([
            MessageType.CLIENT_DISCONNECT,
        ]),
        clientId: z.string().min(1, 'Client ID is required'),
    }),
    z.object({
        role: z.enum([
            MessageType.SESSION_CLOSE,
        ]),
        sessionId: z.string().min(1, 'Session ID is required'),
    })
]);

export type SocketMessage = z.infer<typeof SocketMessageSchema>;