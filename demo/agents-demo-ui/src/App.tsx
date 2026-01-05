import {
	CarConfiguration,
	CarGateSimulationEnvironmentConfig,
} from "@d4ia/agents-demos"
import { BsvNetwork, PrivateKey } from "@d4ia/blockchain-bridge"
import { useContext, useEffect, useRef } from "react"
import { ParkingSimulation } from "./components/simulation/ParkingSimulation"
import { ParkingSimulationContext } from "./context/ParkingSimulationContext"
import { ParkingSimulationContextProvider } from "./context/simulation"

const envConfig: CarGateSimulationEnvironmentConfig = {
	openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY || "",
	network: BsvNetwork.MAIN,
	gateConfig: {
		privateKey: PrivateKey.fromRandom(),
		conversationPrompt:
			"You are a parking gate agent. Be professional and helpful.",
		conversationModel: "gpt-4",
		offerGeneratingPrompt: "Generate a parking offer with clear terms.",
		offerGeneratingModel: "gpt-4",
	},
	maxTurns: 20,
}

const InitialCarsSetup = () => {
	const context = useContext(ParkingSimulationContext)
	const initializedRef = useRef(false)

	useEffect(() => {
		if (!context || initializedRef.current) return
		initializedRef.current = true

		const initialCars: CarConfiguration[] = [
			{
				licensePlate: "ABC-123",
				privateKey: PrivateKey.fromRandom(),
				negotiationPrompt:
					"You are a car agent. Be polite and cooperative.",
				negotiationModel: "gpt-4",
				offerConsiderationPrompt: "Evaluate parking offers carefully.",
				offerConsiderationModel: "gpt-4",
			},
			{
				licensePlate: "XYZ-789",
				privateKey: PrivateKey.fromRandom(),
				negotiationPrompt:
					"You are a car agent. Be polite and cooperative.",
				negotiationModel: "gpt-4",
				offerConsiderationPrompt: "Evaluate parking offers carefully.",
				offerConsiderationModel: "gpt-4",
			},
			{
				licensePlate: "DEF-456",
				privateKey: PrivateKey.fromRandom(),
				negotiationPrompt:
					"You are a car agent. Be polite and cooperative.",
				negotiationModel: "gpt-4",
				offerConsiderationPrompt: "Evaluate parking offers carefully.",
				offerConsiderationModel: "gpt-4",
			},
		]

		initialCars.forEach((carConfig) => {
			try {
				context.environment.addCar(carConfig)
			} catch {
				// Car might already exist, ignore
			}
		})

		context.refreshDisplayData()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return null
}

export const App = () => {
	return (
		<div className="min-h-screen bg-base-200">
			<ParkingSimulationContextProvider initialConfig={envConfig}>
				<InitialCarsSetup />
				<ParkingSimulation />
			</ParkingSimulationContextProvider>
		</div>
	)
}
