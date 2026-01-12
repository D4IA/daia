import type React from "react";
import type { DaiaTransaction } from "../../../types/blockchain";
import PaymentAgreementSummary from "./PaymentAgreementSummary";

interface AgreementSummaryProps {
	txDetails: DaiaTransaction;
}

const AgreementSummary: React.FC<AgreementSummaryProps> = ({ txDetails }) => {

	if (!txDetails || !txDetails.agreement) return null;

	const hasPayment = Object.values(txDetails.agreement.requirements || {}).some(
		(req) => req.type === "payment",
	);

	if (hasPayment) {
		return <PaymentAgreementSummary txDetails={txDetails} />;
	}

	return null;
};

export default AgreementSummary;