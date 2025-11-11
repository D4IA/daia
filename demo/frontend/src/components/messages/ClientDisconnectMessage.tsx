import React from 'react';
import { MessageType } from '../../socket/message';

interface ClientDisconnectMessageData {
    role: MessageType.CLIENT_DISCONNECT;
    clientId: string;
}

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