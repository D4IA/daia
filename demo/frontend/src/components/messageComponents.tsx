import React from 'react';
import { SocketMessage, MessageType } from '../socket/message';

interface CarMessageData {
    role: MessageType.CAR;
    content: string;
    sessionId?: string;
}

interface GateMessageData {
    role: MessageType.GATE;
    content: string;
    sessionId?: string;
}

interface CarSignalingMessageData {
    role: MessageType.CAR_SIGNALING;
    content: string;
    sessionId?: string;
}

interface GateSignalingMessageData {
    role: MessageType.GATE_SIGNALING;
    content: string;
    sessionId?: string;
}

interface CarAwaitsHandlingMessageData {
    role: MessageType.CAR_AWAITS_HANDLING;
    carClientId: string;
    gateClientId: string;
    sessionIdToUse: string;
}

interface SessionCloseMessageData {
    role: MessageType.SESSION_CLOSE;
    sessionId: string;
    initiatedBy?: MessageType.CAR | MessageType.GATE;
}

interface ClientDisconnectMessageData {
    role: MessageType.CLIENT_DISCONNECT;
    clientId: string;
}

export const CarMessage: React.FC<{ message: CarMessageData; index: number }> = ({ message }) => {
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
            </div>
        </div>
    );
};

export const GateMessage: React.FC<{ message: GateMessageData; index: number }> = ({ message }) => {
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
            </div>
        </div>
    );
};

export const CarSignalingMessage: React.FC<{ message: CarSignalingMessageData; index: number }> = ({ message }) => {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-orange-100 border border-orange-300 rounded-lg px-4 py-2 shadow-sm max-w-2xl">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-200 text-orange-800">
                        📡 CAR SIGNALING
                    </span>
                    {message.sessionId && (
                        <span className="text-xs text-orange-600 font-mono">
                            {message.sessionId}
                        </span>
                    )}
                </div>
                <div className="text-sm text-orange-700 leading-relaxed text-center break-words">
                    {message.content}
                </div>
            </div>
        </div>
    );
};

export const GateSignalingMessage: React.FC<{ message: GateSignalingMessageData; index: number }> = ({ message }) => {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-purple-100 border border-purple-300 rounded-lg px-4 py-2 shadow-sm max-w-2xl">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-800">
                        📡 GATE SIGNALING
                    </span>
                    {message.sessionId && (
                        <span className="text-xs text-purple-600 font-mono">
                            {message.sessionId}
                        </span>
                    )}
                </div>
                <div className="text-sm text-purple-700 leading-relaxed text-center break-words">
                    {message.content}
                </div>
            </div>
        </div>
    );
};

export const CarAwaitsHandlingMessage: React.FC<{ message: CarAwaitsHandlingMessageData; index: number }> = ({ message }) => {
    return (
        <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-yellow-500 text-white rounded-lg px-4 py-2 shadow-md">
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-600 text-yellow-100">
                        ⏳ CAR AWAITS HANDLING
                    </span>
                    <span className="text-xs text-yellow-100 font-mono">
                        {message.sessionIdToUse}
                    </span>
                </div>
                <div className="text-sm text-yellow-100 leading-relaxed">
                    <div className="space-y-1">
                        <div>Car: <span className="font-mono text-xs">{message.carClientId}</span></div>
                        <div>Gate: <span className="font-mono text-xs">{message.gateClientId}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SessionCloseMessage: React.FC<{ message: SessionCloseMessageData; index: number }> = ({ message }) => {
    const isCarInitiated = message.initiatedBy === MessageType.CAR;
    const isGateInitiated = message.initiatedBy === MessageType.GATE;
    
    if (isCarInitiated) {
        return (
            <div className="flex justify-start mb-4">
                <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-red-500 text-white rounded-lg px-4 py-2 shadow-md">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-red-100">
                            ❌ SESSION CLOSE
                        </span>
                        <span className="text-xs text-red-100 font-mono">
                            {message.sessionId}
                        </span>
                    </div>
                    <div className="text-sm text-red-100">
                        Initiated by CAR
                    </div>
                </div>
            </div>
        );
    }
    
    if (isGateInitiated) {
        return (
            <div className="flex justify-end mb-4">
                <div className="max-w-xs lg:max-w-md xl:max-w-lg bg-red-500 text-white rounded-lg px-4 py-2 shadow-md">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                        <span className="text-xs text-red-100 font-mono">
                            {message.sessionId}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-red-100">
                            ❌ SESSION CLOSE
                        </span>
                    </div>
                    <div className="text-sm text-red-100 text-right">
                        Initiated by GATE
                    </div>
                </div>
            </div>
        );
    }
    
    // Default center position when initiator is unknown
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-2 shadow-sm max-w-2xl">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-200 text-red-800">
                        ❌ SESSION CLOSE
                    </span>
                    <span className="text-xs text-red-600 font-mono">
                        {message.sessionId}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const ClientDisconnectMessage: React.FC<{ message: ClientDisconnectMessageData; index: number }> = ({ message }) => {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 shadow-sm max-w-2xl">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                        🔌 CLIENT DISCONNECT
                    </span>
                    <span className="text-xs text-gray-600 font-mono">
                        {message.clientId}
                    </span>
                </div>
            </div>
        </div>
    );
};

export const UnknownMessage: React.FC<{ message: SocketMessage; index: number }> = ({ message }) => {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 shadow-sm max-w-2xl">
                <div className="flex items-center gap-2 mb-1 justify-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                        ❓ UNKNOWN
                    </span>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed text-center break-words">
                    {JSON.stringify(message, null, 2)}
                </div>
            </div>
        </div>
    );
};