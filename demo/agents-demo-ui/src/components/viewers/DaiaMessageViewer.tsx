import { DaiaMessage, DaiaMessageType } from "@d4ia/core";
import { OfferAccepted } from "../messages/OfferAccepted";

interface DaiaMessageViewerProps {
	message: DaiaMessage;
}

export const DaiaMessageViewer = ({ message }: DaiaMessageViewerProps) => {
	switch (message.type) {
		case DaiaMessageType.DAIA_HELLO:
			return (
				<div className="bg-base-300 rounded-lg p-4 space-y-2 text-base-content">
					<div className="flex items-center gap-2">
						<span className="text-2xl">👋</span>
						<span className="font-bold text-lg">DAIA Hello</span>
					</div>
					<div className="divider my-1"></div>
					<div className="text-sm space-y-1">
						<div>
							<span className="font-semibold opacity-80">Public Key:</span>
							<div className="font-mono text-xs bg-base-100 p-2 rounded mt-1 break-all">
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
				<div className="bg-base-300 rounded-lg p-4 space-y-2 text-base-content">
					<div className="flex items-center gap-2">
						<span className="text-2xl">📋</span>
						<span className="font-bold text-lg">DAIA Offer</span>
					</div>
					<div className="divider my-1"></div>
					<div className="text-sm space-y-2">
						{innerContent?.naturalLanguageOfferContent && (
							<div>
								<span className="font-semibold opacity-80">Offer:</span>
								<div className="bg-base-100 p-2 rounded mt-1 whitespace-pre-wrap">
									{innerContent.naturalLanguageOfferContent}
								</div>
							</div>
						)}
						{innerContent?.requirements && Object.keys(innerContent.requirements).length > 0 && (
							<div>
								<span className="font-semibold opacity-80">Requirements:</span>
								<ul className="list-disc list-inside bg-base-100 p-2 rounded mt-1 space-y-1">
									{Object.entries(innerContent.requirements).map(([id, req]: [string, unknown]) => {
										const requirement = req as {
											type: string;
											party?: string;
											amount?: number;
										};
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
				return (
					<OfferAccepted
						agreementReference={message.agreementReference}
						agreement={message.agreement}
					/>
				);
			} else {
				return (
					<div className="bg-base-300 rounded-lg p-4 space-y-2 text-base-content">
						<div className="flex items-center gap-2">
							<span className="text-2xl">❌</span>
							<span className="font-bold text-lg text-error">Offer Rejected</span>
						</div>
						<div className="divider my-1"></div>
						<div className="text-sm">
							<span className="font-semibold opacity-80">Rationale:</span>
							<div className="bg-base-100 p-2 rounded mt-1">{message.rationale}</div>
						</div>
					</div>
				);
			}

		default:
			return (
				<div className="bg-base-300 rounded-lg p-4 text-base-content">
					<span className="text-sm opacity-70">Unknown DAIA message type</span>
				</div>
			);
	}
};
