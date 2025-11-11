import React from 'react';
import { MessageType } from '../../socket/message';

interface CarAwaitsHandlingMessageData {
    role: MessageType.CAR_AWAITS_HANDLING;
    carClientId: string;
    gateClientId: string;
    sessionIdToUse: string;
}

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