import React from 'react';
import { ProtocolOffer } from './protocolParser';

interface ProtocolOfferMessageProps {
    data: ProtocolOffer;
    isFromCar: boolean;
}

export const ProtocolOfferMessage: React.FC<ProtocolOfferMessageProps> = ({ data, isFromCar }) => {
    const bgColor = isFromCar ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
    const textColor = isFromCar ? 'text-blue-800' : 'text-green-800';
    const badgeColor = isFromCar ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    const icon = isFromCar ? '🚗' : '🚪';
    const justifyClass = isFromCar ? 'justify-start' : 'justify-end';
    
    return (
        <div className={`flex ${justifyClass} mb-4`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${bgColor} border rounded-lg px-4 py-3 shadow-sm`}>
                <div className={`flex items-center gap-2 mb-2 ${isFromCar ? '' : 'justify-end'}`}>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                        {icon} PROTOCOL OFFER
                    </span>
                </div>
                
                <div className={`space-y-2 ${isFromCar ? '' : 'text-right'}`}>
                    <div className={`text-sm font-semibold ${textColor}`}>
                        Protocol: <span className="font-mono bg-white px-2 py-1 rounded border">{data.protocol}</span>
                    </div>
                    
                    {data.description && (
                        <div className={`text-sm ${textColor}`}>
                            <div className="font-medium mb-1">Description:</div>
                            <div className="bg-white px-3 py-2 rounded border text-gray-700 italic">
                                "{data.description}"
                            </div>
                        </div>
                    )}
                    
                    {data.capabilities && data.capabilities.length > 0 && (
                        <div className={`text-sm ${textColor}`}>
                            <div className="font-medium mb-1">Capabilities:</div>
                            <div className="flex flex-wrap gap-1">
                                {data.capabilities.map((capability, idx) => (
                                    <span key={idx} className="bg-white px-2 py-1 rounded border text-xs font-mono">
                                        {capability}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
