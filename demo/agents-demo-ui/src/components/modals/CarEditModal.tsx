import { useContext } from "react"
import { ParkingSimulationContext } from "../../context/ParkingSimulationContext"
import { CarConfigForm } from "../forms/CarConfigForm"
import { CarConfigFormData } from "../forms/types"
import { PrivateKey } from "@d4ia/blockchain-bridge"

export interface CarEditModalProps {
	isOpen: boolean
	onClose?: () => void
	licensePlate: string
}

export const CarEditModal = ({
	isOpen,
	onClose,
	licensePlate,
}: CarEditModalProps) => {
	const context = useContext(ParkingSimulationContext)
	if (!context) {
		throw new Error(
			"CarEditModal must be used within ParkingSimulationContextProvider",
		)
	}

	if (!isOpen) return null

	const car = context.environment
		.getAllCars()
		.find((c) => c.config.licensePlate === licensePlate)

	if (!car) {
		return (
			<div className="modal modal-open">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Error</h3>
					<p className="py-4">Car not found</p>
					<div className="modal-action">
						<button className="btn" onClick={onClose}>
							Close
						</button>
					</div>
				</div>
			</div>
		)
	}

	const initialData: CarConfigFormData = {
		licensePlate: car.config.licensePlate,
		privateKeyWif: car.config.privateKey.toWif(),
		negotiatingPrompt: car.config.negotiationPrompt,
		consideringPrompt: car.config.offerConsiderationPrompt,
	}

	const handleSubmit = (data: CarConfigFormData) => {
		// Remove the old car
		context.environment.removeCar(licensePlate)

		// Add the updated car
		context.environment.addCar({
			licensePlate: data.licensePlate,
			privateKey: PrivateKey.fromWif(data.privateKeyWif),
			negotiationPrompt: data.negotiatingPrompt,
			negotiationModel: car.config.negotiationModel,
			offerConsiderationPrompt: data.consideringPrompt,
			offerConsiderationModel: car.config.offerConsiderationModel,
		})

		// Refresh the display data
		context.refreshDisplayData()

		if (onClose) {
			onClose()
		}
	}

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-8 overflow-y-auto">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-2xl">Edit Car Configuration</h3>
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
					<CarConfigForm
						initialData={initialData}
						onSubmit={handleSubmit}
						submitButtonText="Save Changes"
					/>
				</div>
			</div>
			<div className="modal-backdrop bg-black/50" onClick={onClose}></div>
		</div>
	)
}
