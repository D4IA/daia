import { useContext, useEffect, useState, useMemo } from "react";
import { CarConfig, ParkingSimulationContext } from "../../context/ParkingSimulationContext";

interface ParkingVisualizationProps {
	onLeaveParking: (licensePlate: string) => void;
	onConfigureNewCar: () => void;
	onOpenGateSettings: () => void;
	onOpenCarSettings: (licensePlate: string) => void;
	onOpenEnterPicker: () => void;
}

export const ParkingVisualization = ({
	onLeaveParking,
	onConfigureNewCar,
	onOpenGateSettings,
	onOpenCarSettings,
	onOpenEnterPicker,
}: ParkingVisualizationProps) => {
	const context = useContext(ParkingSimulationContext);
	if (!context) {
		throw new Error("ParkingVisualization must be used within ParkingSimulationContextProvider");
	}

	const { displayData } = context;
	const [selectedCar, setSelectedCar] = useState<CarConfig | null>(null);
	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const formatDuration = (parkedAt: Date): string => {
		const durationMs = currentTime.getTime() - parkedAt.getTime();
		const totalMinutes = Math.floor(durationMs / (1000 * 60));
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		const parts: string[] = [];
		if (hours > 0) parts.push(`${hours} hours`);
		if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minutes`);

		return parts.join(" ");
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

	const parkedCars = useMemo(() => {
		return context.environment.getAllCars().filter((car) => car.memory.isParked);
	}, [context]);

	const selectedCarInfo = useMemo(() => {
		if (!selectedCar) return null;
		const car = context.environment
			.getAllCars()
			.find((car) => car.config.licensePlate === selectedCar.licensePlate);
		return car;
	}, [selectedCar, context.environment]);

	useEffect(() => {
		setSelectedCar((prev) => {
			if (!prev) return null;
			const car = context.environment
				.getAllCars()
				.find((c) => c.config.licensePlate === prev.licensePlate);
			if (car) {
				return {
					...prev,
					parkedAt: new Date(car.memory.getParkAgreement()?.parkTime ?? prev.parkedAt),
				};
			}
			return prev;
		});
	}, [context]);

	return (
		<div className="flex flex-col lg:flex-row gap-6 md:h-[calc(100vh-2rem)] p-4 bg-base-200">
			{/* Left Column - Controls & Stats */}
			<div className="lg:w-80 flex flex-col gap-6 shrink-0">
				{/* Stats Card */}
				<div className="stats shadow bg-base-100 w-full">
					<div className="stat place-items-center">
						<div className="stat-title">Total Cars Parked</div>
						<div className="stat-value text-primary">{parkedCars.length}</div>
						<div className="stat-desc">Current occupancy</div>
					</div>
				</div>

				{/* Controls Card */}
				<div className="card bg-base-100 shadow-lg">
					<div className="card-body gap-4">
						<h2 className="card-title text-base-content/70 text-sm uppercase tracking-wider">
							Control Panel
						</h2>
						<div className="flex flex-col gap-3">
							<button className="btn btn-primary w-full" onClick={onConfigureNewCar}>
								<span className="text-lg">+</span> Configure New Car
							</button>
							<button className="btn btn-secondary w-full" onClick={onOpenEnterPicker}>
								🚗 Enter Parking
							</button>
							<button className="btn btn-info w-full" onClick={onOpenGateSettings}>
								⚙️ Gate Settings
							</button>
						</div>
					</div>
				</div>

				{/* Gate Status Card */}
				<div
					className={`card shadow-lg transition-colors duration-500 ${
						displayData.gateOpen ? "bg-success/10 border-success/20" : "bg-error/10 border-error/20"
					} border`}
				>
					<div className="card-body items-center text-center py-6">
						<div className="text-4xl mb-2 animate-bounce-slow">{displayData.gateOpen ? "🚧" : "🛑"}</div>
						<div className="flex flex-col items-center">
							<h3 className="font-bold text-lg uppercase tracking-widest">Main Gate</h3>
							<div
								className={`badge ${
									displayData.gateOpen ? "badge-success text-white" : "badge-error text-white"
								} badge-lg mt-2 font-bold shadow-sm`}
							>
								{displayData.gateOpen ? "OPEN" : "CLOSED"}
							</div>
						</div>
					</div>
				</div>

				{/* Selected Car Details (Mobile/Small Screens: show here, Desktop: could stick) */}
				{selectedCar && (
					<div className="card bg-base-100 shadow-xl border border-base-300 animate-in fade-in slide-in-from-left-4 duration-300">
						<div className="card-body p-5">
							<div className="flex justify-between items-start">
								<h2 className="card-title text-sm uppercase text-base-content/60">Selected Vehicle</h2>
								<button className="btn btn-ghost btn-xs btn-square" onClick={() => setSelectedCar(null)}>
									✕
								</button>
							</div>

							<div className="flex items-center gap-4 py-2">
								<div
									className="w-12 h-12 rounded-full shadow-inner flex items-center justify-center text-2xl bg-base-200"
									style={{ border: `3px solid ${selectedCar.color}` }}
								>
									🚗
								</div>
								<div>
									<div className="font-mono text-xl font-bold tracking-wider">
										{selectedCar.licensePlate}
									</div>
									<div className="text-xs text-base-content/70">
										Parked at{" "}
										{selectedCar.parkedAt.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
											day: "2-digit",
											month: "2-digit",
											year: "2-digit",
										})}
									</div>
								</div>
							</div>

							<div className="divider my-1"></div>

							<div className="flex justify-between items-center text-sm">
								<span className="text-base-content/70">Duration</span>
								<span className="font-bold font-mono">{formatDuration(selectedCar.parkedAt)}</span>
							</div>
							<div className="flex justify-between items-center text-sm mb-4">
								<span className="text-base-content italic">
									{selectedCarInfo?.memory.getParkAgreement()?.content}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<button
									className="btn btn-info border-base-300"
									onClick={() => onOpenCarSettings(selectedCar.licensePlate)}
								>
									Settings
								</button>
								<button className="btn btn-secondary" onClick={handleLeave}>
									Checkout
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Main Content - Parking Grid */}
			<div className="flex-1 flex flex-col">
				<div className="card bg-base-100 shadow-xl h-full border border-base-200">
					<div className="card-body p-6 overflow-hidden flex flex-col">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-bold flex items-center gap-2">
								<span className="text-3xl">🅿️</span> Parking Area
							</h2>
						</div>

						<div className="overflow-y-auto flex-1 pr-2">
							{displayData.cars.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-base-content/30 gap-4">
									<div className="text-8xl opacity-20">🚙</div>
									<p className="text-xl font-medium">Parking lot is empty</p>
									<p className="text-sm">Configure a car or let one enter to start.</p>
								</div>
							) : (
								<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
									{displayData.cars.map((car) => (
										<div
											key={car.licensePlate}
											className={`group relative aspect-[4/3] rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
												selectedCar?.licensePlate === car.licensePlate
													? "border-primary bg-primary/5 shadow-md"
													: "border-base-200 hover:border-primary/50 hover:shadow-lg bg-base-50"
											}`}
											onClick={() => handleCarClick(car)}
										>
											{/* Parking Spot ID/Number aesthetic */}
											<div className="absolute top-2 left-2 text-[10px] font-mono text-base-content/30 font-bold">
												SPOT-{car.licensePlate.slice(-3)}
											</div>

											<div className="absolute inset-0 flex flex-col items-center justify-center p-4">
												<div
													className="text-5xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
													style={{ filter: `drop-shadow(0 4px 6px ${car.color}40)` }}
												>
													🚗
												</div>
												<div className="mt-3 font-mono font-bold text-sm bg-base-100 px-2 py-0.5 rounded shadow-sm border border-base-200">
													{car.licensePlate}
												</div>
											</div>

											{/* Bottom Info Bar */}
											<div className="absolute bottom-0 inset-x-0 bg-base-100/90 backdrop-blur-sm p-2 flex justify-between items-center text-xs border-t border-base-200 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
												<span className="font-semibold text-base-content/70">
													{formatDuration(car.parkedAt)}
												</span>
												<div
													className="w-3 h-3 rounded-full shadow-sm ring-1 ring-base-300"
													style={{ backgroundColor: car.color }}
												/>
											</div>

											{/* Selection Indicator */}
											{selectedCar?.licensePlate === car.licensePlate && (
												<div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
