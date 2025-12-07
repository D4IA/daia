import React from "react";
import CardContainer from "../AgreementDetailsCard";
import translations from "../../../translations/en-us.json";
import styles from "./AgreementRequirements.module.scss";

const T = translations.agreement_details_tooltips;

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
  const reqSignature = requirements?.req_signature;

  const type = reqSignature?.type || "N/A";
  const pubKey = reqSignature?.pubKey || "N/A";
  const offererNonce = reqSignature?.offererNonce || "N/A";

  return (
    <CardContainer icon="document" title="Agreement Requirements">
      <RequirementRow
        label="Requirement Type"
        value={type}
        tooltip={T.req_type}
      />

      <RequirementRow
        label="Proposer Public Key (Pubkey)"
        value={pubKey}
        isHash={true}
        tooltip={T.proposer_pubkey}
      />

      <RequirementRow
        label="Offerer Nonce"
        value={offererNonce}
        isHash={true}
        tooltip={T.offerer_nonce}
      />
    </CardContainer>
  );
};

export default AgreementRequirements;
