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

interface CarMessageData {
    role: MessageType.CAR;
    content: string;
    sessionId?: string;
}

export const CarMessage: React.FC<{ message: CarMessageData; index: number }> = ({ message }) => {
    const parsedMessage = parseProtocolMessage(message.content);
    
    // Handle protocol messages specially
    switch (parsedMessage.type) {
        case ProtocolMessageType.PROTOCOL_OFFER:
            return <ProtocolOfferMessage data={parsedMessage.data} isFromCar={true} />;
        case ProtocolMessageType.PROTOCOL_RESPONSE:
            return <ProtocolResponseMessage data={parsedMessage.data} isFromCar={true} />;
        case ProtocolMessageType.PARKING_OFFER:
            return <ParkingOfferMessage data={parsedMessage.data} isFromCar={true} />;
        case ProtocolMessageType.OFFER_RESPONSE:
            return <OfferResponseMessage data={parsedMessage.data} isFromCar={true} />;
        case ProtocolMessageType.OFFER_REQUEST:
            return <OfferRequestMessage isFromCar={true} />;
        case ProtocolMessageType.PAYMENT_INSTRUCTION:
            return <PaymentInstructionMessage data={parsedMessage.data} isFromCar={true} />;
        case ProtocolMessageType.PAYMENT_CONFIRMATION:
            return <PaymentConfirmationMessage data={parsedMessage.data} isFromCar={true} />;
    }
    
    // Regular message display
    return (
        <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-blue-500 text-white rounded-lg px-4 py-2 shadow-md">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-blue-100">
                        🚗 CAR
                    </span>
                    {message.sessionId && (
                        <span className="text-xs text-blue-100 font-mono">
                            {message.sessionId}
                        </span>
                    )}
                </div>
                <div className="text-sm leading-relaxed break-words">
                    {message.content}
                </div>
                {parsedMessage.error && (
                    <div className="mt-2 text-xs text-red-200 bg-red-600 bg-opacity-50 px-2 py-1 rounded">
                        Parse error: {parsedMessage.error}
                    </div>
                )}
            </div>
        </div>
    );
};