import React from 'react';

interface OfferRequestMessageProps {
    isFromCar: boolean;
}

export const OfferRequestMessage: React.FC<OfferRequestMessageProps> = ({ isFromCar }) => {
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
                        {icon} OFFER REQUEST
                    </span>
                </div>
                
                <div className={`text-sm ${textColor} ${isFromCar ? '' : 'text-right'}`}>
                    <div className="bg-white px-3 py-2 rounded border">
                        🤝 Requesting parking offer...
                    </div>
                </div>
            </div>
        </div>
    );
};
