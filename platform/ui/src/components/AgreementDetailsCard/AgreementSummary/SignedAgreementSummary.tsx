import type React from "react";
import type { DaiaTransaction } from "../../../types/blockchain";
import styles from "./AgreementSummary.module.scss";
import { FaFileContract } from "react-icons/fa";
import { Trans, useTranslation } from "react-i18next";
import { PublicKey } from "@bsv/sdk";

interface SignedAgreementSummary {
	txDetails: DaiaTransaction;
}

const SignedAgreementSummary: React.FC<SignedAgreementSummary> = ({ txDetails }) => {
	const { t } = useTranslation();
	const agreement = txDetails.agreement;
	const paymentReq = Object.values(agreement.requirements || {}).find(
		(req) => req.type === "payment",
	) as any;

	const description = agreement.naturalLanguageOfferContent || "No description";
	const paymentAmount = paymentReq?.amount || 0;


	// Assuming the first signature is from the other participant if available, or just use a placeholder logic
	const signers = Object.values(agreement.proofs || {}).filter(
		(p: any) => p.type === "sign",
	).length;

	const participantsAddresses = Object.values(agreement.requirements).filter((p) => p.type === "sign").map((p) => PublicKey.fromString(p.pubKey).toAddress("test"))
	
		const [participantX, participantY] = participantsAddresses;

	const signersStatus =
		signers > 0 ? t("signed_agreement_summary.status_signed") : t("signed_agreement_summary.status_pending");

	return (
		<div className={styles.summaryContainer}>
			<div className={styles.title}>
				<FaFileContract />
				{t("signed_agreement_summary.title")}
			</div>
			<div className={styles.content}>
				<Trans
					i18nKey="signed_agreement_summary.text_main"
					values={{
						signersStatus,
						amount: paymentAmount,
						description: description,
						participantX,
						participantY
					}}
					components={[
						<span className={styles.action} key="status" />,
						<span className={styles.description} key="description" />,
						<a
							href={`https://test.whatsonchain.com/address/${participantX}`}
							target="_blank"
							rel="noreferrer"
							className={styles.highlight}
							key="participantLink"
						/>,
						<a
							href={`https://test.whatsonchain.com/address/${participantY}`}
							target="_blank"
							rel="noreferrer"
							className={styles.highlight}
							key="participantLink"
						/>
					]}
				/>
			</div>
		</div>
	);
};

export default SignedAgreementSummary;
