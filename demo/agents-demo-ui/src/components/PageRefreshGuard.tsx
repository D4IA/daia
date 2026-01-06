import { useState, useEffect } from "react";

const STORAGE_NEVER_SHOW = "page-refresh-warning-never-show";

export const PageRefreshGuard = () => {
	const [showWarning, setShowWarning] = useState(false);

	useEffect(() => {
		// Check if user has permanently dismissed the warning this session
		const neverShow = sessionStorage.getItem(STORAGE_NEVER_SHOW);

		if (!neverShow) {
			setShowWarning(true);
		}
	}, []);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			// Show browser's built-in confirmation dialog
			e.preventDefault();
			// Chrome requires returnValue to be set
			e.returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, []);

	const handleDismiss = () => {
		setShowWarning(false);
	};

	const handleNeverShow = () => {
		sessionStorage.setItem(STORAGE_NEVER_SHOW, "true");
		setShowWarning(false);
	};

	return (
		<>
			{/* Warning Modal */}
			{showWarning && (
				<div className="modal modal-open">
					<div className="modal-box max-w-2xl">
						<h3 className="font-bold text-2xl text-warning mb-4">⚠️ Warning</h3>
						<div className="space-y-4">
							<p className="text-lg">Your simulation state will NOT be saved!</p>
							<div className="alert alert-warning">
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
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<div className="flex-1">
									<p className="font-semibold">All data will be lost if you refresh or leave:</p>
									<ul className="list-disc list-inside text-sm mt-2">
										<li>Car configurations</li>
										<li>Parking sessions</li>
										<li>Conversation history</li>
										<li>Agent settings</li>
									</ul>
								</div>
							</div>
							<p className="text-sm opacity-70">
								The browser will also show a confirmation if you try to refresh or close the page.
							</p>
						</div>
						<div className="modal-action flex-col sm:flex-row gap-2">
							<button className="btn btn-ghost" onClick={handleNeverShow}>
								Don't Show This Anymore
							</button>
							<button className="btn btn-primary" onClick={handleDismiss}>
								I Understand
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
