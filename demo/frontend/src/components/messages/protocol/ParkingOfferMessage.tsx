import React from 'react';
import { ParkingOffer } from './protocolParser';

interface ParkingOfferMessageProps {
    data: ParkingOffer;
    isFromCar: boolean;
}

export const ParkingOfferMessage: React.FC<ParkingOfferMessageProps> = ({ data, isFromCar }) => {
    // Parking offers are typically from gate to car
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
                        {icon} PARKING OFFER
                    </span>
                </div>
                
                <div className={`space-y-3 ${isFromCar ? '' : 'text-right'}`}>
                    <div className={`text-lg font-bold ${textColor} bg-white px-3 py-2 rounded border text-center`}>
                        💰 ${data.pricePerHour.toFixed(2)}/hour
                    </div>
                    
                    {data.description && (
                        <div className={`text-sm ${textColor}`}>
                            <div className="font-medium mb-1">Details:</div>
                            <div className="bg-white px-3 py-2 rounded border text-gray-700">
                                {data.description}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
