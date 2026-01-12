import type React from "react";
import type { DaiaTransaction } from "../../../types/blockchain";
import styles from "./AgreementSummary.module.scss";
import { FaFileContract } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {PublicKey} from "@bsv/sdk"
interface PaymentAgreementSummaryProps {
	txDetails: DaiaTransaction;
}

const addressToShortenAddress = (address: string) => {
	return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

const SatoshisInUSD: React.FC<{ amount: number }> = ({ amount }) => {
	const [feeInUSD, setFeeInUSD] = useState("Loading...");

	useEffect(() => {
		const fetchPrice = async () => {
			try {
				const response = await fetch("https://api.whatsonchain.com/v1/bsv/main/exchangerate");
				const data = await response.json();
				const rate = Number.parseFloat(data.rate);
				const bsvAmount = amount / 100000000;
				const usd = (bsvAmount * rate).toFixed(9);
				setFeeInUSD(`$${usd}`);
				console.log(feeInUSD)
			} catch (e) {
				console.error("Failed to fetch BSV price", e);
				setFeeInUSD("Error");
			}
		};
		fetchPrice();
	}, [amount]);

	return <span className={styles.usdValue}>({feeInUSD})</span>;
};

const PaymentContext: React.FC<{
	authType: "self" | "remote";
	txId: string;
}> = ({ authType, txId }) => {
	const { t } = useTranslation();

	if (authType === "self") {
		return <span>{t("payment_agreement_summary.context_self")}</span>;
	}

	return (
		<span>
			<Trans
				i18nKey="payment_agreement_summary.context_remote"
				values={{ txId: `${txId.substring(0, 8)}...` }}
				components={[
					<Link to={`/agreement_details/${txId}`} className={styles.highlight} key="link" />,
				]}
			/>
		</span>
	);
};

const PaymentAgreementSummary: React.FC<PaymentAgreementSummaryProps> = ({ txDetails }) => {
	const { t } = useTranslation();
	const agreement = txDetails.agreement;
	const paymentReq = Object.values(agreement.requirements || {}).find(
		(req) => req.type === "payment",
	) as any;

	const description = agreement.naturalLanguageOfferContent || "No description";
	const paymentAmount = paymentReq?.amount || 0;
	const participantsAddresses = Object.values(agreement.requirements).filter((p) => p.type === "sign").map((p) => PublicKey.fromString(p.pubKey).toAddress("test"))

	const [participantX, participantY] = participantsAddresses;

	const relatedTxId = paymentReq?.relatedTx || "Unknown";
	// Assuming the first signature is from the other participant if available, or just use a placeholder logic
	const signers = Object.values(agreement.proofs || {}).filter(
		(p: any) => p.type === "sign",
	).length;

	const authType = paymentReq?.auth?.type || "remote";
	const signersStatus =
		signers > 0 ? t("payment_agreement_summary.status_signed") : t("payment_agreement_summary.status_pending");

	return (
		<div className={styles.summaryContainer}>
			<div className={styles.title}>
				<FaFileContract />
				{t("payment_agreement_summary.title")}
			</div>
			<div className={styles.content}>
				<Trans
					i18nKey="payment_agreement_summary.text_main"
					values={{
						relatedTxId: `${relatedTxId.substring(0, 8)}...`,
						signersStatus,
						participant: addressToShortenAddress(participantY),
						amount: paymentAmount,
						description: description,
						participantX,
						participantY,
					}}
					components={[
						<Link
							to={`/agreement_details/${relatedTxId}`}
							className={styles.highlight}
							key="relatedLink"
						/>,
						<span className={styles.action} key="status" />,
						<a
							href={`https://test.whatsonchain.com/address/${participantY}`}
							target="_blank"
							rel="noreferrer"
							className={styles.highlight}
							key="participantLink"
						/>,
						<PaymentContext authType={authType} txId={txDetails.txId} key="context" />,
						<span className={styles.payment} key="amount" />,
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
						/>,
						<br />
					]}
				/>
				<SatoshisInUSD amount={paymentAmount} key="usd" />
			</div>
		</div>
	);
};

export default PaymentAgreementSummary;
