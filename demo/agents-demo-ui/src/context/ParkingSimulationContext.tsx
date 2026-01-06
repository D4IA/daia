import { CarGateSimulationEnvironment } from "@d4ia/agents-demos";
import { createContext, useContext } from "react";

export interface CarConfig {
	licensePlate: string;
	color: string;
	parkedAt: Date;
}

export interface ParkingSimulationDisplayData {
	cars: CarConfig[];
	gateOpen: boolean;
	totalCarsCount: number;
}

export type ParkingSimulationContextData = {
	environment: CarGateSimulationEnvironment;
	displayData: ParkingSimulationDisplayData;

	refreshDisplayData: () => void;
};

export const ParkingSimulationContext = createContext<ParkingSimulationContextData | null>(null);
export const useParkingSimulationContext = () => {
	const context = useContext(ParkingSimulationContext);
	if (!context)
		throw new Error(
			"useParkingSimulationContext must be used within ParkingSimulationContextProvider",
		);
	return context;
};
