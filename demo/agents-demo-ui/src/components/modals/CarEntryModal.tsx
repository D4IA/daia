import { CarConfiguration } from "@d4ia/agents-demos";
import { PrivateKey } from "@d4ia/blockchain-bridge";
import { useContext } from "react";
import { ParkingSimulationContext } from "../../context/ParkingSimulationContext";
import { CarConfigForm } from "../forms/CarConfigForm";
import { CarConfigFormData } from "../forms/types";

export interface CarEntryModalProps {
	isOpen: boolean;
	onClose?: () => void;
	closable?: boolean;
}

export const CarEntryModal = ({ isOpen, onClose, closable = false }: CarEntryModalProps) => {
	const context = useContext(ParkingSimulationContext);
	if (!context) {
		throw new Error("CarEntryModal must be used within ParkingSimulationContextProvider");
	}

	const handleClose = () => {
		if (closable && onClose) {
			onClose();
		}
	};

	const handleCarConfigSubmit = async (data: CarConfigFormData) => {
		try {
			const carConfiguration: CarConfiguration = {
				licensePlate: data.licensePlate,
				privateKey: PrivateKey.fromWif(data.privateKeyWif),
				negotiationPrompt: data.negotiatingPrompt,
				negotiationModel: "gpt-4o-mini",
				offerConsiderationPrompt: data.consideringPrompt,
				offerConsiderationModel: "gpt-4o-mini",
			};

			context.environment.addCar(carConfiguration);

			context.refreshDisplayData();

			if (onClose) {
				onClose();
			}
		} catch (error) {
			alert(`Failed to add car: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-8 overflow-y-auto">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-2xl">Configure New Car</h3>
					{closable && onClose && (
						<button className="btn btn-circle btn-ghost" onClick={handleClose}>
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
					)}
				</div>

				<CarConfigForm onSubmit={handleCarConfigSubmit} submitButtonText="Create Car" />
			</div>
			{closable && <div className="modal-backdrop bg-black/50" onClick={handleClose}></div>}
		</div>
	);
};
