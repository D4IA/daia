import { DaiaAgreement } from "@d4ia/core";

interface OfferAcceptedProps {
	agreementReference: string;
	agreement: DaiaAgreement;
}

export const OfferAccepted = ({ agreementReference, agreement }: OfferAcceptedProps) => {
	let innerContent;
	try {
		innerContent = JSON.parse(agreement.offerContent.inner);
	} catch {
		innerContent = null;
	}

	return (
		<div className="bg-base-300 rounded-lg p-4 space-y-2 text-base-content">
			<div className="flex items-center gap-2">
				<span className="text-2xl">✅</span>
				<span className="font-bold text-lg text-success">Offer Accepted</span>
			</div>
			<div className="divider my-1"></div>
			<div className="text-sm space-y-2">
				<div>
					<span className="font-semibold opacity-80">Agreement Reference:</span>
					<div className="font-mono text-xs bg-base-100 p-2 rounded mt-1 break-all">
						{agreementReference}
					</div>
					<div className="flex flex-col gap-y-1 pt-1">
						<a
							className="text-primary text-xs"
							target="_blank"
							href={`https://daiaui.teawithsand.com/agreement_details/${agreementReference}`}
							rel="noopener noreferrer"
						>
							View on DAIA platform
						</a>
						<a
							className="text-secondary text-xs"
							target="_blank"
							href={`https://test.whatsonchain.com/tx/${agreementReference}`}
							rel="noopener noreferrer"
						>
							View on WhatsOnChain.com
						</a>
					</div>
				</div>
				{innerContent?.naturalLanguageOfferContent && (
					<div>
						<span className="font-semibold opacity-80">Agreement:</span>
						<div className="bg-base-100 p-2 rounded mt-1 whitespace-pre-wrap">
							{innerContent.naturalLanguageOfferContent}
						</div>
					</div>
				)}
				{agreement.proofs && Object.keys(agreement.proofs).length > 0 && (
					<div>
						<span className="font-semibold opacity-80">Proofs:</span>
						<div className="bg-base-100 p-2 rounded mt-1 text-xs">
							{Object.keys(agreement.proofs).length} proof(s) provided
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
