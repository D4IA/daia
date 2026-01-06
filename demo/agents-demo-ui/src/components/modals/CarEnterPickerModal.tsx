import { useContext, useState } from "react"
import { ParkingSimulationContext } from "../../context/ParkingSimulationContext"
import { CarEditModal } from "./CarEditModal"
import { CarSessionModal } from "./CarSessionModal"

export interface CarEnterPickerModalProps {
	isOpen: boolean
	onClose?: () => void
}

export const CarEnterPickerModal = ({
	isOpen,
	onClose,
}: CarEnterPickerModalProps) => {
	const context = useContext(ParkingSimulationContext)
	const [editingCar, setEditingCar] = useState<string | null>(null)
	const [sessionCar, setSessionCar] = useState<string | null>(null)

	if (!context) {
		throw new Error(
			"CarEnterPickerModal must be used within ParkingSimulationContextProvider",
		)
	}

	const allCars = context.environment.getAllCars()
	const availableCars = allCars.filter((car) => !car.memory.isParked)

	const handleSelectCar = (licensePlate: string) => {
		setSessionCar(licensePlate)
	}

	const handleEditCar = (licensePlate: string, e: React.MouseEvent) => {
		e.stopPropagation()
		setEditingCar(licensePlate)
	}

	const handleCloseEdit = () => {
		setEditingCar(null)
		context.refreshDisplayData()
	}

	const handleCloseSession = () => {
		setSessionCar(null)
		context.refreshDisplayData()
		if (onClose) {
			onClose()
		}
	}

	if (!isOpen) return null

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-8">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-2xl">
						Select Car to Enter Parking
					</h3>
					<button
						className="btn btn-circle btn-ghost"
						onClick={onClose}
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

				<div className="container mx-auto max-w-4xl">
					{availableCars.length === 0 ? (
						<div className="flex items-center justify-center h-96">
							<div className="text-center space-y-4">
								<div className="text-6xl mb-4">🚗</div>
								<h2 className="text-2xl font-bold">
									No Available Cars
								</h2>
								<p className="text-lg text-gray-600">
									All cars are currently parked
								</p>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							{availableCars.map((car) => (
								<div
									key={car.config.licensePlate}
									className="bg-base-200 rounded-lg p-6 hover:bg-base-300 transition-colors"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-6 flex-1">
											<div className="text-5xl">🚗</div>
											<div className="flex-1">
												<h3 className="text-xl font-bold">
													{car.config.licensePlate}
												</h3>
												<p className="text-sm text-gray-600 mt-1">
													Ready to enter parking
												</p>
											</div>
										</div>
										<div className="flex gap-2">
											<button
												className="btn btn-secondary btn-sm"
												onClick={(e) =>
													handleEditCar(
														car.config
															.licensePlate,
														e,
													)
												}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													/>
												</svg>
												Edit
											</button>
											<button
												className="btn btn-primary"
												onClick={() =>
													handleSelectCar(
														car.config
															.licensePlate,
													)
												}
											>
												Select Car
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
			<div className="modal-backdrop bg-black/50" onClick={onClose}></div>

			{editingCar && (
				<CarEditModal
					isOpen={true}
					onClose={handleCloseEdit}
					licensePlate={editingCar}
				/>
			)}

			{sessionCar && (
				<CarSessionModal
					isOpen={true}
					onClose={handleCloseSession}
					licensePlate={sessionCar}
				/>
			)}
		</div>
	)
}
