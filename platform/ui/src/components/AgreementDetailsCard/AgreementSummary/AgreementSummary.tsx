import type React from "react";
import type { DaiaTransaction } from "../../../types/blockchain";
import PaymentAgreementSummary from "./PaymentAgreementSummary";

interface AgreementSummaryProps {
	txDetails: DaiaTransaction;
}

const AgreementSummary: React.FC<AgreementSummaryProps> = ({ txDetails }) => {

	if (!txDetails || !txDetails.agreement) return null;

	const hasPaymentRelatedTx = Object.values(txDetails.agreement.requirements || {}).some(
		(req) => req.type === "payment" && req.relatedTx,
	);

	if (hasPaymentRelatedTx) {
		return <PaymentAgreementSummary txDetails={txDetails} />;
	}

	return null;
};

export default AgreementSummary;