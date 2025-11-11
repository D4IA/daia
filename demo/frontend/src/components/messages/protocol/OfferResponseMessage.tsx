import React from 'react';
import { OfferResponse } from './protocolParser';

interface OfferResponseMessageProps {
    data: OfferResponse;
    isFromCar: boolean;
}

export const OfferResponseMessage: React.FC<OfferResponseMessageProps> = ({ data, isFromCar }) => {
    const isAccepted = data.accepted;
    const bgColor = isFromCar 
        ? (isAccepted ? 'bg-blue-50 border-blue-200' : 'bg-blue-50 border-blue-300')
        : (isAccepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-300');
    const textColor = isFromCar 
        ? 'text-blue-800' 
        : (isAccepted ? 'text-green-800' : 'text-red-800');
    const badgeColor = isFromCar 
        ? 'bg-blue-100 text-blue-800' 
        : (isAccepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800');
    const icon = isFromCar ? '🚗' : '🚪';
    const statusIcon = isAccepted ? '✅' : '❌';
    const justifyClass = isFromCar ? 'justify-start' : 'justify-end';
    
    return (
        <div className={`flex ${justifyClass} mb-4`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${bgColor} border rounded-lg px-4 py-3 shadow-sm`}>
                <div className={`flex items-center gap-2 mb-2 ${isFromCar ? '' : 'justify-end'}`}>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                        {icon} OFFER RESPONSE
                    </span>
                </div>
                
                <div className={`space-y-2 ${isFromCar ? '' : 'text-right'}`}>
                    <div className={`text-sm ${textColor}`}>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Decision:</span>
                            <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-bold ${
                                isAccepted 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {statusIcon} {isAccepted ? 'ACCEPTED' : 'REJECTED'}
                            </span>
                        </div>
                    </div>
                    
                    {data.reason && (
                        <div className={`text-sm ${textColor}`}>
                            <div className="font-medium mb-1">Reason:</div>
                            <div className="bg-white px-3 py-2 rounded border text-gray-700 italic">
                                "{data.reason}"
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
