import { CarGateSimulationEnvironment } from "@d4ia/agents-demos";
import { createContext } from "react";

export type EnvironmentSimulationManager<T> = {
	environment: T;
	refresh: () => void;
	set: (newEnvironment: T) => void;
};

export const CarGateSimContext =
	createContext<EnvironmentSimulationManager<CarGateSimulationEnvironment> | null>(null);
