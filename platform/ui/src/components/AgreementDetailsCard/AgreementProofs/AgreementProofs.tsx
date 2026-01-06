import React from "react";
import CardContainer from "../AgreementDetailsCard";
import { useTranslation } from "react-i18next";
import styles from "./AgreementProofs.module.scss";

interface AgreementProofsProps {
	proofsArray?: any[];
	proofs?: any;
}

const ProofRow: React.FC<{
	label: string;
	value: string;
	tooltip: string;
	isHash?: boolean;
	fullValue?: string;
}> = ({ label, value, tooltip, isHash = false, fullValue }) => (
	<div className={styles.proofRowContainer}>
		<div className={styles.labelWrapper}>
			<h4 className={styles.proofLabel}>{label}</h4>
			<span title={tooltip} className={styles.tooltipIcon}>
				?
			</span>
		</div>
		<div
			className={`${styles.proofValue} ${isHash ? styles.hashValue : ""}`}
			title={fullValue || value}
		>
			{value}
		</div>
	</div>
);

const AgreementProofs: React.FC<AgreementProofsProps> = ({ proofsArray, proofs }) => {
	const { t } = useTranslation();

	const proofsData = proofsArray || (proofs ? [proofs] : []);

	if (proofsData.length === 0 || !proofsData[0]) {
		return (
			<CardContainer icon="lock" title={t("agreement_proofs.card_title")}>
				<div className={styles.noProofsMessage}>{t("agreement_proofs.msg_not_available")}</div>
			</CardContainer>
		);
	}

	const formatShortHash = (hash: string, length: number = 20) => {
		if (!hash || hash === "N/A" || hash.length <= length) return hash;
		return `${hash.substring(0, 6)}...${hash.slice(-4)}`;
	};

	return (
		<CardContainer icon="lock" title={t("agreement_proofs.card_title")}>
			<div className={styles.cardContent}>
				{proofsData.map((proof, index) => {
					const type = proof?.type || "N/A";
					const signedNonce = proof?.signeeNonce || proof?.signedNonce || "N/A";
					const signature = proof?.signature || "N/A";

					return (
						<div key={proof.uuid || index} style={{ marginBottom: proofsData.length > 1 ? "30px" : "0" }}>
							{proofsData.length > 1 && (
								<h3
									style={{
										fontSize: "1rem",
										fontWeight: "bold",
										marginBottom: "10px",
										color: "#333",
										borderBottom: "2px solid #e0e0e0",
										paddingBottom: "5px",
									}}
								>
									{t("agreement_proofs.proof_number", { number: index + 1 })}
								</h3>
							)}

							<ProofRow
								label={t("agreement_proofs.label_proof_type")}
								value={type}
								tooltip={t("agreement_proofs.tooltip_proof_type")}
							/>

							<ProofRow
								label={t("agreement_proofs.label_signee_nonce")}
								value={signedNonce}
								isHash={true}
								tooltip={t("agreement_proofs.tooltip_signee_nonce")}
							/>

							<ProofRow
								label={t("agreement_proofs.label_digital_signature")}
								value={formatShortHash(signature, 60)}
								fullValue={signature}
								isHash={true}
								tooltip={t("agreement_proofs.tooltip_digital_signature")}
							/>
						</div>
					);
				})}
			</div>
		</CardContainer>
	);
};

export default AgreementProofs;
