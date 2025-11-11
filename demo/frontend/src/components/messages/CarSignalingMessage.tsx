import React from 'react';
import { MessageType } from '../../socket/message';

interface CarSignalingMessageData {
    role: MessageType.CAR_SIGNALING;
    content: string;
    sessionId?: string;
}

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