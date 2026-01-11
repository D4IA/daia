interface Requirement {
	type: string;
	pubKey?: string;
	amount?: number;
	to?: string;
	relatedTx?: string;
}

interface RequirementsListProps {
	requirements: Record<string, Requirement>;
	signatures?: Record<string, unknown>;
	/**
	 * Map of public key -> label (e.g., "GATE", "CAR")
	 * If not provided, will show shortened public key
	 */
	partyLabels?: Record<string, string>;
}

const shortenPubKey = (pubKey: string): string => {
	if (pubKey.length <= 12) return pubKey;
	return `${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`;
};

const shortenTxId = (txId: string): string => {
	if (txId.length <= 16) return txId;
	return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
};

export const RequirementsList = ({
	requirements,
	signatures = {},
	partyLabels = {},
}: RequirementsListProps) => {
	const entries = Object.entries(requirements);

	if (entries.length === 0) return null;

	return (
		<div>
			<span className="font-semibold opacity-80">Requirements:</span>
			<ul className="bg-base-100 p-2 rounded mt-1 space-y-2">
				{entries.map(([id, req]) => {
					const isSigned = id in signatures;

					if (req.type === "sign" && req.pubKey) {
						const label = partyLabels[req.pubKey] || shortenPubKey(req.pubKey);
						return (
							<li key={id} className="flex items-center gap-2 text-xs justify-between border-b-2 border-b-base-300 pb-2">
								
								<span className="font-semibold">Sign by {label}</span>
								{isSigned ? (
									<span className="badge badge-soft badge-success badge-sm">Signed</span>
								) : (
									<span className="badge badge-soft badge-warning badge-sm">Waiting for sign</span>
								)}
							</li>
						);
					}

					if (req.type === "payment" && req.amount !== undefined) {
						return (
							<li key={id} className="flex flex-col gap-1 text-xs border-b-2 border-b-base-300 pb-2">
								<div className="flex items-center justify-between">
									<span className="font-semibold">Payment of {req.amount} satoshis</span>
									<span className="badge badge-soft badge-warning badge-sm">Waiting for payment</span>
								</div>
								{req.relatedTx && (
									<div className="text-xs opacity-70">
										Based on entry agreement:{" "}
										<a
											href={`https://daiaui.teawithsand.com/agreement_details/${req.relatedTx}`}
											target="_blank"
											rel="noopener noreferrer"
											className="link link-primary"
										>
											{shortenTxId(req.relatedTx)}
										</a>
									</div>
								)}
							</li>
						);
					}

					// Fallback for other requirement types
					return (
						<li key={id} className="flex items-center gap-2 text-xs">
							<span className="font-semibold">{req.type}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
};
