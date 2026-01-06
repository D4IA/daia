import React from "react";
import CardContainer from "../AgreementDetailsCard";
import { useTranslation } from "react-i18next";
import styles from "./AgreementRequirements.module.scss";

interface AgreementRequirementsProps {
	requirementsArray?: any[];
	requirements?: any;
}

const RequirementRow: React.FC<{
	label: string;
	value: string;
	tooltip: string;
	isHash?: boolean;
}> = ({ label, value, tooltip, isHash = false }) => (
	<div className={styles.requirementRowContainer}>
		<div className={styles.labelWrapper}>
			<h4 className={styles.requirementLabel}>{label}</h4>
			<span title={tooltip} className={styles.tooltipIcon}>
				?
			</span>
		</div>

		<div className={`${styles.requirementValue} ${isHash ? styles.hashValue : ""}`} title={value}>
			{value}
		</div>
	</div>
);

const AgreementRequirements: React.FC<AgreementRequirementsProps> = ({
	requirementsArray,
	requirements,
}) => {
	const { t } = useTranslation();

	const reqs = requirementsArray || (requirements ? [requirements] : []);

	if (reqs.length === 0) {
		return (
			<CardContainer icon="document" title={t("agreement_requirements.card_title")}>
				<div>N/A</div>
			</CardContainer>
		);
	}

	return (
		<CardContainer icon="document" title={t("agreement_requirements.card_title")}>
			{reqs.map((req, index) => {
				const type = req?.type || "N/A";
				const pubKey = req?.pubKey || "N/A";
				const offererNonce = req?.offererNonce || "N/A";

				return (
					<div key={req.uuid || index} style={{ marginBottom: reqs.length > 1 ? "30px" : "0" }}>
						{reqs.length > 1 && (
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
								{t("agreement_requirements.requirement_number", {
									number: index + 1,
								})}
							</h3>
						)}

						<RequirementRow
							label={t("agreement_requirements.label_type")}
							value={type}
							tooltip={t("agreement_details_tooltips.req_type")}
						/>

						<RequirementRow
							label={t("agreement_requirements.label_pubkey")}
							value={pubKey}
							isHash={true}
							tooltip={t("agreement_details_tooltips.proposer_pubkey")}
						/>

						<RequirementRow
							label={t("agreement_requirements.label_nonce")}
							value={offererNonce}
							isHash={true}
							tooltip={t("agreement_details_tooltips.offerer_nonce")}
						/>
					</div>
				);
			})}
		</CardContainer>
	);
};

export default AgreementRequirements;
