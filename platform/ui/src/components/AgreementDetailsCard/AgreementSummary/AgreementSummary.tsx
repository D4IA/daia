import type React from "react";
import type { DaiaTransaction } from "../../../types/blockchain";
import PaymentAgreementSummary from "./PaymentAgreementSummary";
import SignedAgreementSummary from "./SignedAgreementSummary";

interface AgreementSummaryProps {
	txDetails: DaiaTransaction;
}

const AgreementSummary: React.FC<AgreementSummaryProps> = ({ txDetails }) => {

	if (!txDetails || !txDetails.agreement) return null;

	console.log(txDetails);
	const hasPaymentRelatedTx = Object.values(txDetails.agreement.requirements || {}).some(
		(req) => req.type === "payment" && req.relatedTx,
	);
	
	if (hasPaymentRelatedTx) {
		return <PaymentAgreementSummary txDetails={txDetails} />;
	}

	const hasTwoSigns = Object.values(txDetails.agreement.proofs || {}).filter(
		(p: any) => p.type === "sign",
	).length === 2;

	if (hasTwoSigns) {
		return <SignedAgreementSummary txDetails={txDetails} />;
	}

	return null;
};

export default AgreementSummary;