import { useState, useRef, useCallback } from "react";
import { ParkingVisualization, ParkingState, CarConfig } from "./ParkingVisualization";
import { CarEntryModal } from "../modals/CarEntryModal";
import { CarExitModal } from "../modals/CarExitModal";
import { GateSettingsModal } from "../modals/GateSettingsModal";
import { CarSettingsModal } from "../modals/CarSettingsModal";
import { CarGateSimulationEnvironment, CarConfiguration, CarGateSimulationEnvironmentConfig } from "@d4ia/agents-demos";
import { PrivateKey, BsvNetwork } from "@d4ia/blockchain-bridge";

export const ParkingSimulation = () => {
	// Parking state for visualization
	const [parkingState, setParkingState] = useState<ParkingState>({
		cars: [
			{
				licensePlate: "ABC-123",
				color: "#3b82f6",
				parkedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
			},
			{
				licensePlate: "XYZ-789",
				color: "#ef4444",
				parkedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
			},
			{
				licensePlate: "DEF-456",
				color: "#10b981",
				parkedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
			},
		],
		gateOpen: false,
	});

	// Modal states
	const [entryModalOpen, setEntryModalOpen] = useState(false);
	const [exitModalOpen, setExitModalOpen] = useState(false);
	const [gateSettingsModalOpen, setGateSettingsModalOpen] = useState(false);
	const [carSettingsModalOpen, setCarSettingsModalOpen] = useState(false);
	const [selectedCarForExit, setSelectedCarForExit] = useState<CarConfig | null>(null);
	const [selectedCarForSettings, setSelectedCarForSettings] = useState<CarConfig | null>(null);

	// CarGateSimulationEnvironment stored in useRef to persist across renders
	const environmentRef = useRef<CarGateSimulationEnvironment | null>(null);

	// Initialize environment on first render
	if (!environmentRef.current) {
		const envConfig: CarGateSimulationEnvironmentConfig = {
			openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY || "",
			network: BsvNetwork.MAIN,
			gateConfig: {
				privateKey: PrivateKey.fromRandom(),
				conversationPrompt: "You are a parking gate agent. Be professional and helpful.",
				conversationModel: "gpt-4",
				offerGeneratingPrompt: "Generate a parking offer with clear terms.",
				offerGeneratingModel: "gpt-4",
			},
			maxTurns: 20,
		};
		environmentRef.current = new CarGateSimulationEnvironment(envConfig);
	}

	const handleConfigureNewCar = useCallback(() => {
		setEntryModalOpen(true);
	}, []);

	const handleCarEntrySubmit = useCallback(
		async (carConfig: {
			licensePlate: string;
			color: string;
			negotiationPrompt?: string;
			offerConsiderationPrompt?: string;
		}) => {
			try {
				// Create car configuration for the environment
				const carConfiguration: CarConfiguration = {
					licensePlate: carConfig.licensePlate,
					privateKey: PrivateKey.fromRandom(),
					negotiationPrompt:
						carConfig.negotiationPrompt ||
						"You are a car agent trying to enter a parking lot. Be polite and follow instructions.",
					negotiationModel: "gpt-4",
					offerConsiderationPrompt:
						carConfig.offerConsiderationPrompt ||
						"Evaluate the parking offer carefully. Accept if reasonable.",
					offerConsiderationModel: "gpt-4",
				};

				// Add car to environment
				environmentRef.current?.addCar(carConfiguration);

				// TODO: Actually run the entry simulation session here
				// For now, just add the car to parking state
				const newCar: CarConfig = {
					licensePlate: carConfig.licensePlate,
					color: carConfig.color,
					parkedAt: new Date(),
				};

				setParkingState((prev) => ({
					...prev,
					cars: [...prev.cars, newCar],
				}));

				setEntryModalOpen(false);
			} catch (error) {
				alert(`Failed to add car: ${error instanceof Error ? error.message : "Unknown error"}`);
			}
		},
		[]
	);

	const handleLeaveParking = useCallback((licensePlate: string) => {
		const car = parkingState.cars.find((c) => c.licensePlate === licensePlate);
		if (car) {
			setSelectedCarForExit(car);
			setExitModalOpen(true);
		}
	}, [parkingState.cars]);

	const handleCarExitConfirm = useCallback(() => {
		if (!selectedCarForExit) return;

		try {
			// Remove car from environment
			environmentRef.current?.removeCar(selectedCarForExit.licensePlate);

			// Remove car from parking state
			setParkingState((prev) => ({
				...prev,
				cars: prev.cars.filter((c) => c.licensePlate !== selectedCarForExit.licensePlate),
			}));

			setExitModalOpen(false);
			setSelectedCarForExit(null);
		} catch (error) {
			alert(`Failed to remove car: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}, [selectedCarForExit]);

	const handleEnterParking = useCallback((licensePlate: string) => {
		// This would trigger entry simulation
		// For now, this is a placeholder
		void licensePlate; // Mark as intentionally unused
	}, []);

	const handleOpenGateSettings = useCallback(() => {
		setGateSettingsModalOpen(true);
	}, []);

	const handleOpenCarSettings = useCallback((licensePlate: string) => {
		const car = parkingState.cars.find((c) => c.licensePlate === licensePlate);
		if (car) {
			setSelectedCarForSettings(car);
			setCarSettingsModalOpen(true);
		}
	}, [parkingState.cars]);

	return (
		<>
			<ParkingVisualization
				parkingState={parkingState}
				onEnterParking={handleEnterParking}
				onLeaveParking={handleLeaveParking}
				onConfigureNewCar={handleConfigureNewCar}
				onOpenGateSettings={handleOpenGateSettings}
				onOpenCarSettings={handleOpenCarSettings}
			/>
			
			<CarEntryModal
				isOpen={entryModalOpen}
				onSubmit={handleCarEntrySubmit}
				onClose={() => setEntryModalOpen(false)}
				closable={true}
			/>

			<CarExitModal
				isOpen={exitModalOpen}
				carLicensePlate={selectedCarForExit?.licensePlate}
				carColor={selectedCarForExit?.color}
				parkedAt={selectedCarForExit?.parkedAt}
				onConfirm={handleCarExitConfirm}
				onClose={() => {
					setExitModalOpen(false);
					setSelectedCarForExit(null);
				}}
				closable={true}
			/>

			<GateSettingsModal
				isOpen={gateSettingsModalOpen}
				onClose={() => setGateSettingsModalOpen(false)}
			/>

			<CarSettingsModal
				isOpen={carSettingsModalOpen}
				carLicensePlate={selectedCarForSettings?.licensePlate}
				onClose={() => {
					setCarSettingsModalOpen(false);
					setSelectedCarForSettings(null);
				}}
			/>
		</>
	);
};
