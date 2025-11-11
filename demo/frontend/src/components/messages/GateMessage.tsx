import React from 'react';
import { MessageType } from '../../socket/message';
import { parseProtocolMessage, ProtocolMessageType } from './protocol';
import {
    ProtocolOfferMessage,
    ProtocolResponseMessage,
    ParkingOfferMessage,
    OfferResponseMessage,
    OfferRequestMessage,
    PaymentInstructionMessage,
    PaymentConfirmationMessage
} from './protocol';

interface GateMessageData {
    role: MessageType.GATE;
    content: string;
    sessionId?: string;
}

export const GateMessage: React.FC<{ message: GateMessageData; index: number }> = ({ message }) => {
    const parsedMessage = parseProtocolMessage(message.content);
    
    // Handle protocol messages specially
    switch (parsedMessage.type) {
        case ProtocolMessageType.PROTOCOL_OFFER:
            return <ProtocolOfferMessage data={parsedMessage.data} isFromCar={false} />;
        case ProtocolMessageType.PROTOCOL_RESPONSE:
            return <ProtocolResponseMessage data={parsedMessage.data} isFromCar={false} />;
        case ProtocolMessageType.PARKING_OFFER:
            return <ParkingOfferMessage data={parsedMessage.data} isFromCar={false} />;
        case ProtocolMessageType.OFFER_RESPONSE:
            return <OfferResponseMessage data={parsedMessage.data} isFromCar={false} />;
        case ProtocolMessageType.OFFER_REQUEST:
            return <OfferRequestMessage isFromCar={false} />;
        case ProtocolMessageType.PAYMENT_INSTRUCTION:
            return <PaymentInstructionMessage data={parsedMessage.data} isFromCar={false} />;
        case ProtocolMessageType.PAYMENT_CONFIRMATION:
            return <PaymentConfirmationMessage data={parsedMessage.data} isFromCar={false} />;
    }
    
    // Regular message display
    return (
        <div className="flex justify-end mb-4">
            <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-green-500 text-white rounded-lg px-4 py-2 shadow-md">
                <div className="flex items-center gap-2 mb-1 justify-end">
                    {message.sessionId && (
                        <span className="text-xs text-green-100 font-mono">
                            {message.sessionId}
                        </span>
                    )}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-green-100">
                        🚪 GATE
                    </span>
                </div>
                <div className="text-sm leading-relaxed break-words text-right">
                    {message.content}
                </div>
                {parsedMessage.error && (
                    <div className="mt-2 text-xs text-red-200 bg-red-600 bg-opacity-50 px-2 py-1 rounded text-right">
                        Parse error: {parsedMessage.error}
                    </div>
                )}
            </div>
        </div>
    );
};