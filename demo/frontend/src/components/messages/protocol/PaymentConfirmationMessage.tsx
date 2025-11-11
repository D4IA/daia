import React from 'react';
import { PaymentConfirmation } from './protocolParser';

interface PaymentConfirmationMessageProps {
    data: PaymentConfirmation;
    isFromCar: boolean;
}

export const PaymentConfirmationMessage: React.FC<PaymentConfirmationMessageProps> = ({ data, isFromCar }) => {
    const bgColor = isFromCar ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
    const textColor = isFromCar ? 'text-blue-800' : 'text-green-800';
    const badgeColor = isFromCar ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    const icon = isFromCar ? '🚗' : '🚪';
    const justifyClass = isFromCar ? 'justify-start' : 'justify-end';
    
    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };
    
    return (
        <div className={`flex ${justifyClass} mb-4`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${bgColor} border rounded-lg px-4 py-3 shadow-sm`}>
                <div className={`flex items-center gap-2 mb-2 ${isFromCar ? '' : 'justify-end'}`}>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                        {icon} PAYMENT CONFIRMATION
                    </span>
                </div>
                
                <div className={`space-y-3 ${isFromCar ? '' : 'text-right'}`}>
                    <div className={`text-center ${textColor}`}>
                        <div className="text-2xl mb-1">✅</div>
                        <div className="font-bold">Payment Confirmed</div>
                    </div>
                    
                    <div className={`text-sm ${textColor} space-y-2`}>
                        <div>
                            <div className="font-medium mb-1">Amount:</div>
                            <div className="bg-white px-3 py-2 rounded border font-bold text-center">
                                ${data.paymentInstruction.amount.toFixed(2)}
                            </div>
                        </div>
                        
                        <div>
                            <div className="font-medium mb-1">Address:</div>
                            <div className="bg-white px-2 py-1 rounded border font-mono text-xs break-all text-gray-700">
                                {data.paymentInstruction.address}
                            </div>
                        </div>
                        
                        <div>
                            <div className="font-medium mb-1">Signature:</div>
                            <div className="bg-white px-2 py-1 rounded border font-mono text-xs break-all text-gray-700">
                                {data.signature}
                            </div>
                        </div>
                        
                        {data.timestamp && (
                            <div>
                                <div className="font-medium mb-1">Timestamp:</div>
                                <div className="bg-white px-2 py-1 rounded border text-xs text-gray-700">
                                    {formatTimestamp(data.timestamp)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
