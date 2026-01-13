import { useState, useEffect } from "react";
import { useParkingSimulationContext } from "../../context/ParkingSimulationContext";

export interface CarSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	licensePlate?: string | null;
}

export interface CarSettings {
	parkedAt: Date;
}

const formatLocalDateTime = (date: Date): string => {
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const CarSettingsModal = ({ isOpen, onClose, licensePlate }: CarSettingsModalProps) => {
	const context = useParkingSimulationContext();
	const [parkedAt, setParkedAt] = useState<string>("");
	const [error, setError] = useState<string>("");

	// Find the car by license plate
	const car = licensePlate
		? context.environment.getAllCars().find((c) => c.config.licensePlate === licensePlate)
		: undefined;

	// Initialize parkedAt from car memory
	useEffect(() => {
		if (car) {
			const agreement = car.memory.getParkAgreement();
			if (agreement?.parkTime) {
				const date = new Date(agreement.parkTime);
				setParkedAt(formatLocalDateTime(date));
			}
		}
	}, [car]);

	const handleDateChange = (newValue: string) => {
		const selectedDate = new Date(newValue);
		const now = new Date();

		if (selectedDate > now) {
			setError("You can't set the future date");
			return;
		}

		setError("");
		setParkedAt(newValue);
	};

	if (!isOpen) return null;

	const handleSave = () => {
		const parkAgreement = car?.memory.getParkAgreement();

		if (!parkAgreement || !car?.config.licensePlate) {
			return;
		}

		const newParkedAt = new Date(parkedAt);

		// Update car memory
		car?.memory.park(parkAgreement.content, parkAgreement.reference, newParkedAt);
		context.environment.setCarMemory(car.config.licensePlate, car.memory);

		// Update gate database
		const gateDb = context.environment.getGate().db;
		gateDb.updateByPlate(car.config.licensePlate, { parkedAt: newParkedAt });

		context.refreshDisplayData();
		onClose();
	};

	const handleCancel = () => {
		onClose();
	};

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-2 md:p-8 overflow-y-auto">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-2xl">Car Settings - {car?.config?.licensePlate}</h3>
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

				<div className="form-control w-full max-w-md">
					<label className="label">
						<span className="label-text font-semibold">Parked At</span>
					</label>
					<input
						type="datetime-local"
						className={`input input-bordered w-full ${error ? "input-error" : ""}`}
						value={parkedAt}
						max={formatLocalDateTime(new Date())}
						onChange={(e) => handleDateChange(e.target.value)}
					/>
					{error && (
						<label className="label">
							<span className="label-text-alt text-error">{error}</span>
						</label>
					)}
				</div>

				<div className="modal-action mt-6">
					<button className="btn btn-ghost" onClick={handleCancel}>
						Cancel
					</button>
					<button className="btn btn-primary" onClick={handleSave}>
						Save
					</button>
				</div>
			</div>
			<div className="modal-backdrop bg-black/50" onClick={onClose}></div>
		</div>
	);
};
