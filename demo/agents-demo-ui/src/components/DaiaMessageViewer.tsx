import { DaiaMessage, DaiaMessageType } from "@d4ia/core";

interface DaiaMessageViewerProps {
	message: DaiaMessage;
}

export const DaiaMessageViewer = ({ message }: DaiaMessageViewerProps) => {
	switch (message.type) {
		case DaiaMessageType.DAIA_HELLO:
			return (
				<div className="bg-base-200 rounded-lg p-4 space-y-2">
					<div className="flex items-center gap-2">
						<span className="text-2xl">👋</span>
						<span className="font-bold text-lg">DAIA Hello</span>
					</div>
					<div className="divider my-1"></div>
					<div className="text-sm space-y-1">
						<div>
							<span className="font-semibold">Public Key:</span>
							<div className="font-mono text-xs bg-base-300 p-2 rounded mt-1 break-all">
								{message.publicKey}
							</div>
						</div>
					</div>
				</div>
			);

		case DaiaMessageType.OFFER: {
			let innerContent;
			try {
				innerContent = JSON.parse(message.content.inner);
			} catch {
				innerContent = null;
			}

			return (
				<div className="bg-base-200 rounded-lg p-4 space-y-2">
					<div className="flex items-center gap-2">
						<span className="text-2xl">📋</span>
						<span className="font-bold text-lg">DAIA Offer</span>
					</div>
					<div className="divider my-1"></div>
					<div className="text-sm space-y-2">
						{innerContent?.naturalLanguageOfferContent && (
							<div>
								<span className="font-semibold">Offer:</span>
								<div className="bg-base-300 p-2 rounded mt-1 whitespace-pre-wrap">
									{innerContent.naturalLanguageOfferContent}
								</div>
							</div>
						)}
						{innerContent?.requirements && Object.keys(innerContent.requirements).length > 0 && (
							<div>
								<span className="font-semibold">Requirements:</span>
								<ul className="list-disc list-inside bg-base-300 p-2 rounded mt-1 space-y-1">
									{Object.entries(innerContent.requirements).map(([id, req]: [string, unknown]) => {
										const requirement = req as { type: string; party?: string; amount?: number };
										return (
											<li key={id} className="text-xs">
												<span className="font-semibold">{requirement.type}</span>
												{requirement.type === "sign" && requirement.party && (
													<span className="ml-2">by {requirement.party}</span>
												)}
												{requirement.type === "payment" && requirement.amount && (
													<span className="ml-2">{requirement.amount} satoshis</span>
												)}
											</li>
										);
									})}
								</ul>
							</div>
						)}
					</div>
				</div>
			);
		}

		case DaiaMessageType.OFFER_RESPONSE:
			if (message.result === "accept") {
				let innerContent;
				try {
					innerContent = JSON.parse(message.agreement.offerContent.inner);
				} catch {
					innerContent = null;
				}

				return (
					<div className="bg-base-200 rounded-lg p-4 space-y-2">
						<div className="flex items-center gap-2">
							<span className="text-2xl">✅</span>
							<span className="font-bold text-lg text-success">Offer Accepted</span>
						</div>
						<div className="divider my-1"></div>
						<div className="text-sm space-y-2">
							<div>
								<span className="font-semibold">Agreement Reference:</span>
								<div className="font-mono text-xs bg-base-300 p-2 rounded mt-1 break-all">
									{message.agreementReference}
								</div>
							</div>
							{innerContent?.naturalLanguageOfferContent && (
								<div>
									<span className="font-semibold">Agreement:</span>
									<div className="bg-base-300 p-2 rounded mt-1 whitespace-pre-wrap">
										{innerContent.naturalLanguageOfferContent}
									</div>
								</div>
							)}
							{message.agreement.proofs && Object.keys(message.agreement.proofs).length > 0 && (
								<div>
									<span className="font-semibold">Proofs:</span>
									<div className="bg-base-300 p-2 rounded mt-1 text-xs">
										{Object.keys(message.agreement.proofs).length} proof(s) provided
									</div>
								</div>
							)}
						</div>
					</div>
				);
			} else {
				return (
					<div className="bg-base-200 rounded-lg p-4 space-y-2">
						<div className="flex items-center gap-2">
							<span className="text-2xl">❌</span>
							<span className="font-bold text-lg text-error">Offer Rejected</span>
						</div>
						<div className="divider my-1"></div>
						<div className="text-sm">
							<span className="font-semibold">Rationale:</span>
							<div className="bg-base-300 p-2 rounded mt-1">
								{message.rationale}
							</div>
						</div>
					</div>
				);
			}

		default:
			return (
				<div className="bg-base-200 rounded-lg p-4">
					<span className="text-sm opacity-70">Unknown DAIA message type</span>
				</div>
			);
	}
};
