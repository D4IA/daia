import React from 'react';
import { PaymentInstruction } from './protocolParser';

interface PaymentInstructionMessageProps {
    data: PaymentInstruction | null | undefined;
    isFromCar: boolean;
}

export const PaymentInstructionMessage: React.FC<PaymentInstructionMessageProps> = ({ data, isFromCar }) => {
    const bgColor = isFromCar ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
    const textColor = isFromCar ? 'text-blue-800' : 'text-green-800';
    const badgeColor = isFromCar ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    const icon = isFromCar ? '🚗' : '🚪';
    const justifyClass = isFromCar ? 'justify-start' : 'justify-end';
    
    // Handle special case where data is null (payment instruction request)
    if (data === null) {
        return (
            <div className={`flex ${justifyClass} mb-4`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${bgColor} border rounded-lg px-4 py-3 shadow-sm`}>
                    <div className={`flex items-center gap-2 mb-2 ${isFromCar ? '' : 'justify-end'}`}>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                            {icon} PAYMENT INSTRUCTION REQUEST
                        </span>
                    </div>
                    
                    <div className={`text-sm ${textColor} ${isFromCar ? '' : 'text-right'}`}>
                        <div className="bg-white px-3 py-2 rounded border text-center">
                            💳 Requesting payment instruction...
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Handle case where data is undefined (this shouldn't happen with the new logic, but keeping for safety)
    if (data === undefined) {
        return (
            <div className={`flex ${justifyClass} mb-4`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 shadow-sm`}>
                    <div className={`flex items-center gap-2 mb-2 ${isFromCar ? '' : 'justify-end'}`}>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800`}>
                            {icon} PAYMENT INSTRUCTION
                        </span>
                    </div>
                    
                    <div className={`text-sm text-gray-800 ${isFromCar ? '' : 'text-right'}`}>
                        <div className="bg-white px-3 py-2 rounded border text-center">
                            ⏳ Processing payment instruction...
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Handle normal payment instruction with data
    return (
        <div className={`flex ${justifyClass} mb-4`}>
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${bgColor} border rounded-lg px-4 py-3 shadow-sm`}>
                <div className={`flex items-center gap-2 mb-2 ${isFromCar ? '' : 'justify-end'}`}>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badgeColor}`}>
                        {icon} PAYMENT INSTRUCTION
                    </span>
                </div>
                
                <div className={`space-y-3 ${isFromCar ? '' : 'text-right'}`}>
                    <div className={`text-lg font-bold ${textColor} bg-white px-3 py-2 rounded border text-center`}>
                        💳 ${data.amount.toFixed(2)}
                    </div>
                    
                    <div className={`text-sm ${textColor}`}>
                        <div className="font-medium mb-1">Payment Address:</div>
                        <div className="bg-white px-3 py-2 rounded border font-mono text-xs break-all text-gray-700">
                            {data.address}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
