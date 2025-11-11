import React from 'react';
import { SocketMessage } from '../../socket/message';

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