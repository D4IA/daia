import { useState, useEffect } from "react";

// State types
export interface CarConfig {
	licensePlate: string;
	color: string;
	parkedAt: Date;
}

export interface ParkingState {
	cars: CarConfig[];
	gateOpen: boolean;
}

interface ParkingVisualizationProps {
	parkingState: ParkingState;
	onEnterParking: (licensePlate: string) => void;
	onLeaveParking: (licensePlate: string) => void;
	onConfigureNewCar: () => void;
}

export const ParkingVisualization = ({
	parkingState,
	onLeaveParking,
	onConfigureNewCar,
}: ParkingVisualizationProps) => {
	const [selectedCar, setSelectedCar] = useState<CarConfig | null>(null);
	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const getParkedDurationMinutes = (parkedAt: Date): number => {
		const durationMs = currentTime.getTime() - parkedAt.getTime();
		return Math.floor(durationMs / (1000 * 60));
	};

	const handleCarClick = (car: CarConfig) => {
		setSelectedCar(car);
	};

	const handleLeave = () => {
		if (selectedCar) {
			onLeaveParking(selectedCar.licensePlate);
			setSelectedCar(null);
		}
	};

	return (
		<div className="flex gap-8 h-screen p-8">
			{/* Left Panel - Controls */}
			<div className="w-1/4 flex flex-col gap-4">
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body">
						<h2 className="card-title">Parking Control</h2>
						<button className="btn btn-primary" onClick={onConfigureNewCar}>
							+ Configure New Car
						</button>
						<div className="divider"></div>
						<div className="stats stats-vertical shadow">
							<div className="stat">
								<div className="stat-title">Total Cars</div>
								<div className="stat-value">{parkingState.cars.length}</div>
							</div>
							<div className="stat">
								<div className="stat-title">Gate Status</div>
								<div className="stat-value text-sm">
									{parkingState.gateOpen ? "🟢 Open" : "🔴 Closed"}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Car Details Panel */}
				{selectedCar && (
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body">
							<h2 className="card-title">Car Details</h2>
							<div className="space-y-2">
								<p>
									<strong>License Plate:</strong> {selectedCar.licensePlate}
								</p>
								<p>
									<strong>Color:</strong>{" "}
									<span
										className="inline-block w-6 h-6 rounded border border-base-300"
										style={{ backgroundColor: selectedCar.color }}
									></span>
								</p>
								<p>
									<strong>Parked At:</strong> {selectedCar.parkedAt.toLocaleTimeString()}
								</p>
								<p>
									<strong>Duration:</strong>{" "}
									<span className="badge badge-info">
										{getParkedDurationMinutes(selectedCar.parkedAt)} minutes
									</span>
								</p>
							</div>
							<div className="card-actions justify-end mt-4">
								<button className="btn btn-warning" onClick={handleLeave}>
									Leave Parking
								</button>
								<button className="btn btn-ghost" onClick={() => setSelectedCar(null)}>
									Close
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Center - Gate */}
			<div className="w-1/6 flex flex-col items-center justify-center">
				<div className="text-center">
					<div className="text-6xl mb-4">{parkingState.gateOpen ? "🚧" : "🚪"}</div>
					<h3 className="text-xl font-bold">GATE</h3>
					<div className={`badge ${parkingState.gateOpen ? "badge-success" : "badge-error"} mt-2`}>
						{parkingState.gateOpen ? "OPEN" : "CLOSED"}
					</div>
				</div>
			</div>

			{/* Right Panel - Parking Area */}
			<div className="flex-1 bg-base-100 rounded-xl shadow-xl p-6">
				<h2 className="text-2xl font-bold mb-4">Parking Area</h2>
				<div className="grid grid-cols-3 gap-4">
					{parkingState.cars.map((car) => (
						<div
						key={car.licensePlate}
						className={`card bg-base-200 shadow cursor-pointer hover:shadow-2xl transition-all ${
							selectedCar?.licensePlate === car.licensePlate ? "ring-4 ring-primary" : ""
							}`}
							onClick={() => handleCarClick(car)}
						>
							<div className="card-body p-4">
								<div className="text-5xl text-center mb-2">🚗</div>
								<h3 className="font-bold text-center text-sm">{car.licensePlate}</h3>
								<div
									className="w-full h-4 rounded mt-2"
									style={{ backgroundColor: car.color }}
								></div>							<div className="text-xs text-center mt-2 text-base-content/70">
								{getParkedDurationMinutes(car.parkedAt)} min
							</div>							</div>
						</div>
					))}
				</div>
				{parkingState.cars.length === 0 && (
					<div className="text-center text-base-content/50 mt-20">
						<div className="text-6xl mb-4">🅿️</div>
						<p className="text-xl">No cars parked yet</p>
					</div>
				)}
			</div>
		</div>
	);
};
