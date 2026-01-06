import { useContext } from "react";
import { ParkingSimulationContext } from "../../context/ParkingSimulationContext";
import { GateConfigForm } from "../forms/GateConfigForm";
import { GateConfigFormData } from "../forms/types";
import { PrivateKey } from "@d4ia/blockchain-bridge";

export interface GateSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave?: (settings: GateSettings) => void;
}

export interface GateSettings {
	conversationPrompt: string;
	conversationModel: string;
	offerGeneratingPrompt: string;
	offerGeneratingModel: string;
}

export const GateSettingsModal = ({ isOpen, onClose }: GateSettingsModalProps) => {
	const context = useContext(ParkingSimulationContext);

	if (!context) {
		throw new Error("GateSettingsModal must be used within ParkingSimulationContextProvider");
	}

	if (!isOpen) return null;

	const gateConfig = context.environment.getGateConfig();

	const initialData: GateConfigFormData = {
		privateKeyWif: gateConfig.privateKey.toWif(),
		coveringPrompt: gateConfig.conversationPrompt,
		offersPrompt: gateConfig.offerGeneratingPrompt,
	};

	const handleSubmit = (data: GateConfigFormData) => {
		// Update the gate configuration
		const newGateConfig = context.environment.getGateConfig();
		newGateConfig.privateKey = PrivateKey.fromWif(data.privateKeyWif);
		newGateConfig.conversationPrompt = data.coveringPrompt;
		newGateConfig.offerGeneratingPrompt = data.offersPrompt;

		// Update the gate's private key
		const gate = context.environment.getGate();
		gate.privateKey = PrivateKey.fromWif(data.privateKeyWif);

		// Refresh display data
		context.refreshDisplayData();

		onClose();
	};

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-0 md:p-8 overflow-y-auto">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-2xl ml-2 md:ml-0 mt-2 md:mt-0">Gate Settings</h3>
					<button className="btn btn-circle btn-ghost" onClick={onClose}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="container mx-auto max-w-4xl">
					<GateConfigForm
						initialData={initialData}
						onSubmit={handleSubmit}
						submitButtonText="Save Settings"
					/>
				</div>
			</div>
			<div className="modal-backdrop bg-black/50" onClick={onClose}></div>
		</div>
	);
};
