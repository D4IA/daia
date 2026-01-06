import { PrivateKey } from "@d4ia/blockchain-bridge"
import { useState, useEffect } from "react"
import { CarConfigFormData } from "./types"
import { PREDEFEINED_CAR_PRIVATE_KEYS_WIFS } from "../../predefines"
import {
	DEFAULT_CAR_NEGOTIATING_PROMPT,
	DEFAULT_CAR_CONSIDERING_PROMPT,
} from "../../constants/prompts"

interface CarConfigFormProps {
	initialData?: CarConfigFormData
	onSubmit: (data: CarConfigFormData) => void
	submitButtonText?: string
}

export const CarConfigForm = ({
	initialData,
	onSubmit,
	submitButtonText,
}: CarConfigFormProps) => {
	const [licensePlate, setLicensePlate] = useState(
		initialData?.licensePlate || "",
	)
	const [privateKeyWif, setPrivateKeyWif] = useState(
		initialData?.privateKeyWif || "",
	)
	const [negotiatingPrompt, setNegotiatingPrompt] = useState(
		initialData?.negotiatingPrompt || DEFAULT_CAR_NEGOTIATING_PROMPT,
	)
	const [consideringPrompt, setConsideringPrompt] = useState(
		initialData?.consideringPrompt || DEFAULT_CAR_CONSIDERING_PROMPT,
	)
	const [privateKeyError, setPrivateKeyError] = useState("")
	const [testnetAddress, setTestnetAddress] = useState("")

	useEffect(() => {
		if (initialData?.privateKeyWif) {
			validatePrivateKey(initialData.privateKeyWif)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const validatePrivateKey = (wif: string): boolean => {
		if (!wif.trim()) {
			setPrivateKeyError("Private key is required")
			setTestnetAddress("")
			return false
		}

		try {
			const privateKey = PrivateKey.fromWif(wif)
			const publicKey = privateKey.toPublicKey()
			const address = publicKey.toAddress("testnet")
			setPrivateKeyError("")
			setTestnetAddress(address)
			return true
		} catch {
			setPrivateKeyError("Invalid WIF format")
			setTestnetAddress("")
			return false
		}
	}

	const generateNewKey = () => {
		const newPrivateKey = PrivateKey.fromRandom()
		const wif = newPrivateKey.toWif()
		setPrivateKeyWif(wif)
		validatePrivateKey(wif)
	}

	const loadPredefinedKey = (wif: string) => {
		setPrivateKeyWif(wif)
		validatePrivateKey(wif)
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!licensePlate.trim()) {
			return
		}

		if (!validatePrivateKey(privateKeyWif)) {
			return
		}

		if (!negotiatingPrompt.trim()) {
			return
		}

		if (!consideringPrompt.trim()) {
			return
		}

		onSubmit({
			licensePlate,
			privateKeyWif,
			negotiatingPrompt,
			consideringPrompt,
		})
	}

	const handlePrivateKeyBlur = () => {
		if (privateKeyWif.trim()) {
			validatePrivateKey(privateKeyWif)
		}
	}

	return (
		<div className="card bg-base-100 shadow-2xl max-w-3xl mx-auto">
			<div className="card-body p-8">
				<h2 className="card-title text-3xl mb-6 text-primary">
					Car Configuration
				</h2>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* License Plate Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">
								License Plate
							</span>
						</label>
						<input
							type="text"
							placeholder="e.g., ABC-123"
							className="input input-bordered w-full"
							value={licensePlate}
							onChange={(e) => setLicensePlate(e.target.value)}
							required
						/>
					</div>

					{/* Private Key Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">
								Private Key (WIF Format)
							</span>
						</label>
						<div className="flex gap-2 w-full">
							<input
								type="text"
								placeholder="Enter private key in WIF format"
								className={`input input-bordered flex-1 ${privateKeyError ? "input-error" : ""}`}
								value={privateKeyWif}
								onChange={(e) =>
									setPrivateKeyWif(e.target.value)
								}
								onBlur={handlePrivateKeyBlur}
								required
							/>
							<button
								type="button"
								className="btn btn-secondary"
								onClick={generateNewKey}
							>
								🔑 Generate
							</button>
							{PREDEFEINED_CAR_PRIVATE_KEYS_WIFS.length > 0 && (
								<div className="dropdown dropdown-end">
									<button
										type="button"
										tabIndex={0}
										className="btn btn-primary"
									>
										📋 Predefined
									</button>
									<ul
										tabIndex={0}
										className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mt-2"
									>
										{PREDEFEINED_CAR_PRIVATE_KEYS_WIFS.map(
											(wif, index) => (
												<li key={index}>
													<button
														type="button"
														onClick={() =>
															loadPredefinedKey(
																wif,
															)
														}
														className="text-xs font-mono"
													>
														Key #{index + 1}:{" "}
														{wif.substring(0, 8)}...
													</button>
												</li>
											),
										)}
									</ul>
								</div>
							)}
						</div>
						{privateKeyError && (
							<label className="label">
								<span className="label-text-alt text-error">
									{privateKeyError}
								</span>
							</label>
						)}

						{/* Testnet address - always shown */}
						<div
							className={`mt-3 p-4 bg-base-200 rounded-lg ${!testnetAddress ? "opacity-50" : ""}`}
						>
							<div className="flex items-start gap-2">
								<span className="text-sm font-semibold text-secondary">
									Testnet Address:
								</span>
								<code className="text-sm flex-1 break-all">
									{testnetAddress ||
										"Enter or generate a valid private key to see address"}
								</code>
							</div>
							{testnetAddress && (
								<div className="mt-2">
									<a
										href={`https://test.whatsonchain.com/address/${testnetAddress}`}
										target="_blank"
										rel="noopener noreferrer"
										className="link link-primary text-sm underline"
									>
										🔍 View on WhatsOnChain
									</a>
								</div>
							)}
						</div>

						{/* Faucet info - always shown */}
						<div className="alert alert-info mt-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								className="stroke-current shrink-0 w-6 h-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<div className="text-sm">
								<p className="font-semibold">
									Get test BSV coins:
								</p>
								<p>
									Visit the{" "}
									<a
										href="https://faucet.bsvblockchain.org/"
										target="_blank"
										rel="noopener noreferrer"
										className="link link-primary underline"
									>
										BSV Testnet Faucet
									</a>{" "}
									and send test coins to the address above.
								</p>
							</div>
						</div>
					</div>

					{/* Negotiating Prompt Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">
								Negotiating Prompt
							</span>
						</label>
						<textarea
							placeholder="Enter the prompt used to negotiate with gate"
							className="textarea textarea-bordered h-24 w-full"
							value={negotiatingPrompt}
							onChange={(e) =>
								setNegotiatingPrompt(e.target.value)
							}
							required
						/>
						<label className="label">
							<span className="label-text-alt">
								Prompt used when negotiating with the gate
							</span>
						</label>
					</div>

					{/* Considering Prompt Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">
								Considering Prompt
							</span>
						</label>
						<textarea
							placeholder="Enter the prompt used to consider gate's offers"
							className="textarea textarea-bordered h-24 w-full"
							value={consideringPrompt}
							onChange={(e) =>
								setConsideringPrompt(e.target.value)
							}
							required
						/>
						<label className="label">
							<span className="label-text-alt">
								Prompt used when considering gate offers
							</span>
						</label>
					</div>

					{/* Submit Button */}
					<div className="card-actions justify-end mt-8">
						<button
							type="submit"
							className="btn btn-primary btn-lg gap-2"
						>
							<span>✓</span>
							{submitButtonText || "Submit Configuration"}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
