import { PrivateKey } from "@d4ia/blockchain-bridge";
import { useState, useEffect } from "react";
import { GateConfigFormData } from "./types";
import { PREDEFINED_GATE_PRIVATE_KEYS_WIFS } from "../../predefines";
import {
	DEFAULT_GATE_CONVERSATION_PROMPT,
	DEFAULT_GATE_OFFER_PROMPT,
} from "../../constants/prompts";

interface GateConfigFormProps {
	initialData?: GateConfigFormData;
	onSubmit: (data: GateConfigFormData) => void;
	submitButtonText?: string;
}

export const GateConfigForm = ({
	initialData,
	onSubmit,
	submitButtonText,
}: GateConfigFormProps) => {
	const [privateKeyWif, setPrivateKeyWif] = useState(initialData?.privateKeyWif || "");
	const [coveringPrompt, setCoveringPrompt] = useState(
		initialData?.coveringPrompt || DEFAULT_GATE_CONVERSATION_PROMPT,
	);
	const [offersPrompt, setOffersPrompt] = useState(
		initialData?.offersPrompt || DEFAULT_GATE_OFFER_PROMPT,
	);
	const [privateKeyError, setPrivateKeyError] = useState("");
	const [testnetAddress, setTestnetAddress] = useState("");

	useEffect(() => {
		if (initialData?.privateKeyWif) {
			validatePrivateKey(initialData.privateKeyWif);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const validatePrivateKey = (wif: string): boolean => {
		if (!wif.trim()) {
			setPrivateKeyError("Private key is required");
			setTestnetAddress("");
			return false;
		}

		try {
			const privateKey = PrivateKey.fromWif(wif);
			const publicKey = privateKey.toPublicKey();
			const address = publicKey.toAddress("testnet");
			setPrivateKeyError("");
			setTestnetAddress(address);
			return true;
		} catch {
			setPrivateKeyError("Invalid WIF format");
			setTestnetAddress("");
			return false;
		}
	};

	const generateNewKey = () => {
		const newPrivateKey = PrivateKey.fromRandom();
		const wif = newPrivateKey.toWif();
		setPrivateKeyWif(wif);
		validatePrivateKey(wif);
	};

	const loadPredefinedKey = (wif: string) => {
		setPrivateKeyWif(wif);
		validatePrivateKey(wif);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!validatePrivateKey(privateKeyWif)) {
			return;
		}

		if (!coveringPrompt.trim()) {
			return;
		}

		if (!offersPrompt.trim()) {
			return;
		}

		onSubmit({
			privateKeyWif,
			coveringPrompt,
			offersPrompt,
		});
	};

	const handlePrivateKeyBlur = () => {
		if (privateKeyWif.trim()) {
			validatePrivateKey(privateKeyWif);
		}
	};

	return (
		<div className="card bg-base-100 shadow-2xl max-w-3xl mx-auto">
			<div className="card-body p-2 md:p-8">
				<h2 className="card-title text-3xl mb-6 text-primary">Gate Configuration</h2>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Private Key Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">Private Key (WIF Format)</span>
						</label>
						<div className="flex gap-2 w-full">
							<input
								type="text"
								placeholder="Enter private key in WIF format"
								className={`input input-bordered flex-1 ${privateKeyError ? "input-error" : ""}`}
								value={privateKeyWif}
								onChange={(e) => setPrivateKeyWif(e.target.value)}
								onBlur={handlePrivateKeyBlur}
								required
							/>
							<button type="button" className="btn btn-secondary" onClick={generateNewKey}>
								🔑 Generate
							</button>
							{PREDEFINED_GATE_PRIVATE_KEYS_WIFS.length > 0 && (
								<div className="dropdown dropdown-end">
									<button type="button" tabIndex={0} className="btn btn-primary">
										📋 Predefined
									</button>
									<ul
										tabIndex={0}
										className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-64 mt-2"
									>
										{PREDEFINED_GATE_PRIVATE_KEYS_WIFS.map((wif, index) => (
											<li key={index}>
												<button
													type="button"
													onClick={() => loadPredefinedKey(wif)}
													className="text-xs font-mono"
												>
													Key #{index + 1}: {wif.substring(0, 8)}...
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
						{privateKeyError && (
							<label className="label">
								<span className="label-text-alt text-error">{privateKeyError}</span>
							</label>
						)}

						{/* Testnet address - always shown */}
						<div className={`mt-3 p-4 bg-base-200 rounded-lg ${!testnetAddress ? "opacity-50" : ""}`}>
							<div className="flex items-start gap-2">
								<span className="text-sm font-semibold text-secondary">Testnet Address:</span>
								<code className="text-sm flex-1 break-all">
									{testnetAddress || "Enter or generate a valid private key to see address"}
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
					</div>

					{/* Covering Prompt Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">Covering Prompt</span>
						</label>
						<textarea
							placeholder="Enter the covering prompt"
							className="textarea textarea-bordered h-24 w-full"
							value={coveringPrompt}
							onChange={(e) => setCoveringPrompt(e.target.value)}
							required
						/>
						<label className="label">
							<span className="label-text-alt">Prompt used for covering</span>
						</label>
					</div>

					{/* Offers Prompt Field */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-semibold">Offers Prompt</span>
						</label>
						<textarea
							placeholder="Enter the prompt for generating offers for entering the parking"
							className="textarea textarea-bordered h-24 w-full"
							value={offersPrompt}
							onChange={(e) => setOffersPrompt(e.target.value)}
							required
						/>
						<label className="label">
							<span className="label-text-alt text-wrap">
								Prompt used for generating offers for entering the parking
							</span>
						</label>
					</div>

					{/* Submit Button */}
					<div className="card-actions justify-end mt-8">
						<button type="submit" className="btn btn-primary btn-lg gap-2">
							<span>✓</span>
							{submitButtonText || "Submit Configuration"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
