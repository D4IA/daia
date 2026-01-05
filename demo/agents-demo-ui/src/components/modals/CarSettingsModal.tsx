export interface CarSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	carLicensePlate?: string;
	onSave?: (settings: CarSettings) => void;
}

export interface CarSettings {
	negotiationPrompt: string;
	negotiationModel: string;
	offerConsiderationPrompt: string;
	offerConsiderationModel: string;
}

export const CarSettingsModal = ({ isOpen, onClose }: CarSettingsModalProps) => {
	if (!isOpen) return null;

	return (
		<div className="modal modal-open">
			<div className="modal-box w-screen h-screen max-w-none max-h-none rounded-none p-8">
				<div className="flex justify-between items-center mb-6">
					<h3 className="font-bold text-2xl">Car Settings</h3>
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

				<div className="flex items-center justify-center h-full">
					<div className="text-center">
						<div className="text-6xl mb-4">🚧</div>
						<h2 className="text-3xl font-bold">Not Implemented Yet</h2>
					</div>
				</div>
			</div>
			<div className="modal-backdrop bg-black/50" onClick={onClose}></div>
		</div>
	);
};
