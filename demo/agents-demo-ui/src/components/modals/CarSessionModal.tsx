import { useContext, useState, useEffect, useRef } from "react";
import { ParkingSimulationContext } from "../../context/ParkingSimulationContext";
import { CarGateSimulationEventType, ConversationViewer } from "../viewers/ConversationViewer";
import type { CarGateSimulationEvent } from "../viewers/ConversationViewer";

export interface CarSessionModalProps {
	isOpen: boolean;
	onClose?: () => void;
	licensePlate: string;
}

type SessionStatus = "idle" | "running" | "completed" | "error";

export const CarSessionModal = ({ isOpen, onClose, licensePlate }: CarSessionModalProps) => {
	const context = useContext(ParkingSimulationContext);
	const [events, setEvents] = useState<CarGateSimulationEvent[]>([]);
	const [status, setStatus] = useState<SessionStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const sessionStartedRef = useRef(false);

	if (!context) {
		throw new Error("CarSessionModal must be used within ParkingSimulationContextProvider");
	}

	useEffect(() => {
		if (isOpen && status === "idle" && !sessionStartedRef.current) {
			sessionStartedRef.current = true;
			startSession();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const startSession = async () => {
		try {
			setStatus("running");
			setError(null);
			setEvents([]);

			// Create session
			const session = context.environment.createSession(licensePlate);

			// Run the session
			const result = await session.run({
				onNewMessage: (event) => {
					setEvents((prev) => [...prev, event]);
				},
			});

			const hasGateOpenEvent = session
				.getEvents()
				.find(
					(e) =>
						e.type === CarGateSimulationEventType.GATE_ACTION &&
						(e.action === "let-in" || e.action === "let-out"),
				);

			if (hasGateOpenEvent) {
				// Write results back to environment
				context.environment.setCarMemory(licensePlate, result.carMemory);
				context.environment.setGateDatabase(result.gateDb);

				// eslint-disable-next-line no-console
				console.log("Car/Gate session results", result);
			}

			// Refresh display data
			context.refreshDisplayData();

			setStatus("completed");
		} catch (err) {
			setStatus("error");
			setError(err instanceof Error ? err.message : "Unknown error");
		}
	};

	const handleClose = () => {
		if (status === "running") {
			// Don't allow closing while running
			return;
		}
		setStatus("idle");
		setEvents([]);
		setError(null);
		sessionStartedRef.current = false;
		if (onClose) {
			onClose();
		}
	};

	if (!isOpen) return null;

	const car = context.environment.getAllCars().find((c) => c.config.licensePlate === licensePlate);

	if (!car) {
		return (
			<div className="modal modal-open">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Error</h3>
					<p className="py-4">Car not found</p>
					<div className="modal-action">
						<button className="btn" onClick={handleClose}>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-0 flex flex-col">
				{/* Header */}
				<div className="flex justify-between items-center p-6 border-b border-base-300">
					<div>
						<h3 className="font-bold text-2xl">Car Session: {licensePlate}</h3>
						<div className="flex items-center gap-4 mt-2">
							<span
								className={`badge ${
									status === "idle"
										? "badge-ghost"
										: status === "running"
											? "badge-warning"
											: status === "completed"
												? "badge-success"
												: "badge-error"
								}`}
							>
								{status === "idle" && "Initializing"}
								{status === "running" && "🔄 Running"}
								{status === "completed" && "✓ Completed"}
								{status === "error" && "✗ Error"}
							</span>
							{status === "running" && <span className="loading loading-spinner loading-sm"></span>}
						</div>
					</div>
					<button
						className={`btn btn-circle btn-ghost ${status === "running" ? "btn-disabled" : ""}`}
						onClick={handleClose}
						disabled={status === "running"}
						title={status === "running" ? "Cannot close while session is running" : "Close"}
					>
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

				{/* Content */}
				<div className="flex-1 overflow-hidden">
					{error ? (
						<div className="flex items-center justify-center h-full p-6">
							<div className="alert alert-error max-w-2xl">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="stroke-current shrink-0 h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<div>
									<h3 className="font-bold">Session Error</h3>
									<div className="text-sm">{error}</div>
								</div>
							</div>
						</div>
					) : (
						<ConversationViewer
							events={events}
							title={`${car.memory.isParked ? "Exit" : "Enter"} Session`}
						/>
					)}
				</div>

				{/* Footer */}
				{(status === "completed" || status === "error") && (
					<div className="p-6 border-t border-base-300">
						<div className="flex justify-end">
							<button className="btn btn-primary" onClick={handleClose}>
								Close
							</button>
						</div>
					</div>
				)}
			</div>
			{status !== "running" && (
				<div className="modal-backdrop bg-black/50" onClick={handleClose}></div>
			)}
		</div>
	);
};
