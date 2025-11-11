import { SocketMessage, MessageType } from "../socket/message";
import { useEffect, useRef } from "react";
import {
    CarMessage,
    GateMessage,
    CarSignalingMessage,
    GateSignalingMessage,
    CarAwaitsHandlingMessage,
    SessionCloseMessage,
    ClientDisconnectMessage,
    UnknownMessage
} from "./messages";

const renderMessage = (message: SocketMessage, index: number) => {
    switch (message.role) {
        case MessageType.CAR:
            return <CarMessage key={index} message={message as Parameters<typeof CarMessage>[0]['message']} index={index} />;
        case MessageType.GATE:
            return <GateMessage key={index} message={message as Parameters<typeof GateMessage>[0]['message']} index={index} />;
        case MessageType.CAR_SIGNALING:
            return <CarSignalingMessage key={index} message={message as Parameters<typeof CarSignalingMessage>[0]['message']} index={index} />;
        case MessageType.GATE_SIGNALING:
            return <GateSignalingMessage key={index} message={message as Parameters<typeof GateSignalingMessage>[0]['message']} index={index} />;
        case MessageType.CAR_AWAITS_HANDLING:
            return <CarAwaitsHandlingMessage key={index} message={message as Parameters<typeof CarAwaitsHandlingMessage>[0]['message']} index={index} />;
        case MessageType.SESSION_CLOSE:
            return <SessionCloseMessage key={index} message={message as Parameters<typeof SessionCloseMessage>[0]['message']} index={index} />;
        case MessageType.CLIENT_DISCONNECT:
            return <ClientDisconnectMessage key={index} message={message as Parameters<typeof ClientDisconnectMessage>[0]['message']} index={index} />;
        default:
            return <UnknownMessage key={index} message={message} index={index} />;
    }
};

export const MessagesDisplay = ({ 
    messages, 
    autoScroll = true, 
    className = "", 
    style 
}: { 
    messages: SocketMessage[], 
    autoScroll?: boolean,
    className?: string,
    style?: React.CSSProperties
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (autoScroll) {
            scrollToBottom();
        }
    }, [messages, autoScroll]);

    return (
        <div 
            className={`flex flex-col h-full bg-gray-50 ${className}`}
            style={style}
        >
            <h3 className="sticky top-0 z-10 text-lg font-semibold text-gray-800 p-4 border-b border-gray-300 bg-white">Messages</h3>
            {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-center">No messages yet</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-4xl mx-auto">
                        {messages.map((message, index) => renderMessage(message, index))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}