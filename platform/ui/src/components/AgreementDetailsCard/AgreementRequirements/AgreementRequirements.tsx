import React from "react";
import CardContainer from "../AgreementDetailsCard";
import { useTranslation } from "react-i18next";
import styles from "./AgreementRequirements.module.scss";

interface AgreementRequirementsProps {
  requirements: any;
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

    <div
      className={`${styles.requirementValue} ${isHash ? styles.hashValue : ""}`}
      title={value}
    >
      {value}
    </div>
  </div>
);

const AgreementRequirements: React.FC<AgreementRequirementsProps> = ({
  requirements,
}) => {
  const { t } = useTranslation();
  const reqSignature = requirements?.req_signature;

  const type = reqSignature?.type || "N/A";
  const pubKey = reqSignature?.pubKey || "N/A";
  const offererNonce = reqSignature?.offererNonce || "N/A";

  return (
    <CardContainer icon="document" title="Agreement Requirements">
      <RequirementRow
        label="Requirement Type"
        value={type}
        tooltip={t("agreement_details_tooltips.req_type")}
      />

      <RequirementRow
        label="Proposer Public Key (Pubkey)"
        value={pubKey}
        isHash={true}
        tooltip={t("agreement_details_tooltips.proposer_pubkey")}
      />

      <RequirementRow
        label="Offerer Nonce"
        value={offererNonce}
        isHash={true}
        tooltip={t("agreement_details_tooltips.offerer_nonce")}
      />
    </CardContainer>
  );
};

export default AgreementRequirements;
