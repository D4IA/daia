import {
	CarGateSimulationEnvironment,
	CarGateSimulationEnvironmentConfig,
} from "@d4ia/agents-demos";
import { ReactNode, useMemo, useState, useCallback } from "react";
import {
	ParkingSimulationContext,
	ParkingSimulationContextData,
	ParkingSimulationDisplayData,
	CarConfig,
} from "./ParkingSimulationContext";

export const ParkingSimulationContextProvider = (props: {
	initialConfig: CarGateSimulationEnvironmentConfig;
	children?: ReactNode;
}) => {
	const [environment] = useState(() => new CarGateSimulationEnvironment(props.initialConfig));

	const [envForceRefresh, setEnvForceRefresh] = useState(0);

	const displayData: ParkingSimulationDisplayData = useMemo(() => {
		const allCars = environment.getAllCars();
		const cars: CarConfig[] = allCars
			.filter((car) => car.memory.isParked)
			.map((car) => {
				const parkAgreement = car.memory.getParkAgreement();
				return {
					licensePlate: car.config.licensePlate,
					color: "#3b82f6",
					parkedAt: parkAgreement?.parkTime ?? new Date(),
				};
			});

		return {
			cars,
			gateOpen: false,
			totalCarsCount: allCars.length,
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [envForceRefresh]);

	const refreshDisplayData = useCallback(() => {
		setEnvForceRefresh((x) => (x + 1) % 1000000);
	}, []);

	const data: ParkingSimulationContextData = useMemo(() => {
		return {
			displayData,
			environment,
			refreshDisplayData,
		};
	}, [displayData, environment, refreshDisplayData]);

	return (
		<ParkingSimulationContext.Provider value={data}>
			{props.children}
		</ParkingSimulationContext.Provider>
	);
};
