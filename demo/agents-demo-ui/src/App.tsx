import { useState, useEffect } from "react"
import {
	CarGateSimulationEnvironmentConfig,
} from "@d4ia/agents-demos"
import { BsvNetwork, PrivateKey } from "@d4ia/blockchain-bridge"
import { PageRefreshGuard } from "./components/PageRefreshGuard"
import { ParkingSimulation } from "./components/simulation/ParkingSimulation"
import { ParkingSimulationContextProvider } from "./context/simulation"
import {
	DEFAULT_GATE_CONVERSATION_PROMPT,
	DEFAULT_GATE_OFFER_PROMPT,
} from "./constants/prompts"

interface RuntimeConfig {
	OPENAI_API_KEY: string
}

export const App = () => {
	const [config, setConfig] = useState<CarGateSimulationEnvironmentConfig | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchConfig = async () => {
			try {
				// Try to fetch runtime config from server
				const response = await fetch('/api/config')
				const runtimeConfig: RuntimeConfig = await response.json()
				
				const openAIApiKey = runtimeConfig.OPENAI_API_KEY || ""
				
				if (!openAIApiKey) {
					setError("OPENAI_API_KEY is not configured")
					return
				}

				const envConfig: CarGateSimulationEnvironmentConfig = {
					openAIApiKey,
					network: BsvNetwork.TEST,
					gateConfig: {
						privateKey: PrivateKey.fromRandom(),
						conversationPrompt: DEFAULT_GATE_CONVERSATION_PROMPT,
						conversationModel: "gpt-4o-mini",
						offerGeneratingPrompt: DEFAULT_GATE_OFFER_PROMPT,
						offerGeneratingModel: "gpt-4o-mini",
					},
					maxTurns: 20,
				}
				
				setConfig(envConfig)
			} catch (error) {
				setError(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
			}
		}

		fetchConfig()
	}, [])

	if (error) {
		return (
			<div className="min-h-screen bg-base-200 flex items-center justify-center">
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			</div>
		)
	}

	if (!config) {
		return (
			<div className="min-h-screen bg-base-200 flex items-center justify-center">
				<div className="loading loading-spinner loading-lg"></div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-base-200">
			<PageRefreshGuard />
			<ParkingSimulationContextProvider initialConfig={config}>
				<ParkingSimulation />
			</ParkingSimulationContextProvider>
		</div>
	)
}
