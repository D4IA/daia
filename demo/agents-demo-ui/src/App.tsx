import { useState } from "react";
import { ConversationViewer, CarGateSimulationEventType } from "./components/ConversationViewer";
import type { CarGateSimulationEvent } from "./components/ConversationViewer";

export const App = () => {
	// Demo conversation data
	const [events] = useState<CarGateSimulationEvent[]>([
		{
			type: CarGateSimulationEventType.CAR_LOG,
			message: "Car agent initialized",
		},
		{
			type: CarGateSimulationEventType.GATE_LOG,
			message: "Gate agent ready",
		},
		{
			type: CarGateSimulationEventType.CAR_TO_GATE_MESSAGE,
			message: "Hello, I would like to enter the parking lot. My license plate is ABC-123.",
		},
		{
			type: CarGateSimulationEventType.GATE_TO_CAR_MESSAGE,
			message: "Welcome! I can offer you a parking spot for $5 per hour. The terms include: standard liability coverage, exit before midnight, and payment in BSV.",
		},
		{
			type: CarGateSimulationEventType.CAR_LOG,
			message: "Analyzing offer...",
		},
		{
			type: CarGateSimulationEventType.CAR_TO_GATE_MESSAGE,
			message: "The terms are acceptable. I agree to pay $5 per hour and will exit before midnight. Here is my digital signature.",
		},
		{
			type: CarGateSimulationEventType.GATE_LOG,
			message: "Verifying signature and payment...",
		},
		{
			type: CarGateSimulationEventType.GATE_LOG,
			message: "Signature verified successfully",
		},
		{
			type: CarGateSimulationEventType.GATE_TO_CAR_MESSAGE,
			message: "Perfect! Your payment and signature have been verified. You may now enter. Have a pleasant stay!",
		},
		{
			type: CarGateSimulationEventType.GATE_ACTION,
			action: "let-in",
		},
		{
			type: CarGateSimulationEventType.SESSION_END,
			side: "gate",
		},
	]);

	return (
		<div className="min-h-screen bg-base-200 p-8">
			<div className="max-w-5xl mx-auto h-[calc(100vh-4rem)] bg-base-100 rounded-xl shadow-2xl">
				<ConversationViewer events={events} title="Car-Gate Negotiation" />
			</div>
		</div>
	);
}	