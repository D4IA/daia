import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HourlyRateContextType {
    hourlyRate: number;
    setHourlyRate: (rate: number) => void;
}

const HourlyRateContext = createContext<HourlyRateContextType | null>(null);

interface HourlyRateProviderProps {
    children: ReactNode;
    defaultRate?: number;
}

export const HourlyRateProvider: React.FC<HourlyRateProviderProps> = ({
    children,
    defaultRate = 8.5
}) => {
    const [hourlyRate, setHourlyRate] = useState<number>(defaultRate);

    const value: HourlyRateContextType = {
        hourlyRate,
        setHourlyRate,
    };

    return (
        <HourlyRateContext.Provider value={value}>
            {children}
        </HourlyRateContext.Provider>
    );
};

export const useHourlyRate = (): HourlyRateContextType => {
    const context = useContext(HourlyRateContext);
    if (!context) {
        throw new Error('useHourlyRate must be used within a HourlyRateProvider');
    }
    return context;
};

export const useHourlyRateOptional = (): HourlyRateContextType | null => {
    return useContext(HourlyRateContext);
};
