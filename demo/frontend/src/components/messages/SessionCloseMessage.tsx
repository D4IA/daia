import React from 'react';
import { MessageType } from '../../socket/message';

interface SessionCloseMessageData {
    role: MessageType.SESSION_CLOSE;
    sessionId: string;
    initiatedBy?: MessageType.CAR | MessageType.GATE;
}

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