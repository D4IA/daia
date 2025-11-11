import React from 'react';
import { MessageType } from '../../socket/message';

interface GateSignalingMessageData {
    role: MessageType.GATE_SIGNALING;
    content: string;
    sessionId?: string;
}

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