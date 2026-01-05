import { useCallback, useContext, useState } from "react"
import { ParkingSimulationContext } from "../../context/ParkingSimulationContext"
import { CarEnterPickerModal } from "../modals/CarEnterPickerModal"
import { CarEntryModal } from "../modals/CarEntryModal"
import { CarExitModal } from "../modals/CarExitModal"
import { CarSettingsModal } from "../modals/CarSettingsModal"
import { GateSettingsModal } from "../modals/GateSettingsModal"
import { ParkingVisualization } from "./ParkingVisualization"

export const ParkingSimulation = () => {
	const context = useContext(ParkingSimulationContext)
	if (!context) {
		throw new Error(
			"ParkingSimulation must be used within ParkingSimulationContextProvider",
		)
	}

	// Modal states
	const [entryModalOpen, setEntryModalOpen] = useState(false)
	const [exitModalOpen, setExitModalOpen] = useState(false)
	const [exitingCarLicensePlate, setExitingCarLicensePlate] = useState<
		string | null
	>(null)
	const [gateSettingsModalOpen, setGateSettingsModalOpen] = useState(false)
	const [carSettingsModalOpen, setCarSettingsModalOpen] = useState(false)
	const [settingsCarLicensePlate, setSettingsCarLicensePlate] = useState<
		string | null
	>(null)
	const [carEnterPickerModalOpen, setCarEnterPickerModalOpen] =
		useState(false)

	const handleConfigureNewCar = useCallback(() => {
		setEntryModalOpen(true)
	}, [])

	const handleLeaveParking = useCallback((licensePlate: string) => {
		setExitingCarLicensePlate(licensePlate)
		setExitModalOpen(true)
	}, [])

	const handleOpenGateSettings = useCallback(() => {
		setGateSettingsModalOpen(true)
	}, [])

	const handleOpenCarSettings = useCallback((licensePlate: string) => {
		setSettingsCarLicensePlate(licensePlate)
		setCarSettingsModalOpen(true)
	}, [])

	const handleOpenEnterPicker = useCallback(() => {
		setCarEnterPickerModalOpen(true)
	}, [])

	return (
		<>
			<ParkingVisualization
				onLeaveParking={handleLeaveParking}
				onConfigureNewCar={handleConfigureNewCar}
				onOpenGateSettings={handleOpenGateSettings}
				onOpenCarSettings={handleOpenCarSettings}
				onOpenEnterPicker={handleOpenEnterPicker}
			/>

			<CarEntryModal
				isOpen={entryModalOpen}
				onClose={() => setEntryModalOpen(false)}
				closable={true}
			/>

			<CarExitModal
				isOpen={exitModalOpen}
				licensePlate={exitingCarLicensePlate}
				onClose={() => {
					setExitModalOpen(false)
					setExitingCarLicensePlate(null)
				}}
				closable={true}
			/>

			<GateSettingsModal
				isOpen={gateSettingsModalOpen}
				onClose={() => setGateSettingsModalOpen(false)}
			/>

			<CarSettingsModal
				isOpen={carSettingsModalOpen}
				licensePlate={settingsCarLicensePlate}
				onClose={() => {
					setCarSettingsModalOpen(false)
					setSettingsCarLicensePlate(null)
				}}
			/>

			<CarEnterPickerModal
				isOpen={carEnterPickerModalOpen}
				onClose={() => setCarEnterPickerModalOpen(false)}
			/>
		</>
	)
}
