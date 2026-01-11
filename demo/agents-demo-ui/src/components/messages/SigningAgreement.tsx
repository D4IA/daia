import { DaiaAgreement } from "@d4ia/core";

interface SigningAgreementProps {
	agreement: DaiaAgreement;
}

export const SigningAgreement = ({ agreement }: SigningAgreementProps) => {
	// Try to extract signer public key from proofs (sign type proofs)
	let signerInfo = "private key";
	
	try {
		const innerContent = JSON.parse(agreement.offerContent.inner);
		const requirements = innerContent?.requirements || {};
		
		// Find first sign requirement with pubKey
		for (const [, req] of Object.entries(requirements)) {
			const requirement = req as { type: string; pubKey?: string };
			if (requirement.type === "sign" && requirement.pubKey) {
				// Shorten the public key for display
				const pubKey = requirement.pubKey;
				signerInfo = `key ${pubKey}`;
				break;
			}
		}
	} catch {
		// Keep default signerInfo
	}

	return (
		<div className="bg-base-300 rounded-lg p-4 space-y-2 text-base-content">
			<div className="flex items-center gap-2">
				<span className="text-2xl">🔏</span>
				<span className="font-bold text-lg text-info">Signed Agreement</span>
			</div>
			<div className="divider my-1"></div>
			<div className="text-sm">
				<div className="bg-base-100 p-2 rounded">
					Signed the agreement using {signerInfo}
				</div>
			</div>
		</div>
	);
};
