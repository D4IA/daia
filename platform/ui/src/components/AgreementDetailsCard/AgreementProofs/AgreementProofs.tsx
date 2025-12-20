import React from "react";
import CardContainer from "../AgreementDetailsCard";
import { useTranslation } from "react-i18next";
import styles from "./AgreementProofs.module.scss";

interface AgreementProofsProps {
  proofs: any;
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

const AgreementProofs: React.FC<AgreementProofsProps> = ({ proofs }) => {
  const { t } = useTranslation();

  if (!proofs || Object.keys(proofs).length === 0) {
    return (
      <CardContainer icon="lock" title={t("agreement_proofs.card_title")}>
        <div className={styles.noProofsMessage}>
          {t("agreement_proofs.msg_not_available")}
        </div>
      </CardContainer>
    );
  }

  const req = proofs.req_signature || {};
  const topLevelSig = proofs.signature;

  const type = req.type || "N/A";
  const signeeNonce = req.signeeNonce || "N/A";
  const signature = req.signature || topLevelSig || "N/A";

  const formatShortHash = (hash: string, length: number = 20) => {
    if (!hash || hash === "N/A" || hash.length <= length) return hash;
    return `${hash.substring(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <CardContainer icon="lock" title={t("agreement_proofs.card_title")}>
      <div className={styles.cardContent}>
        <ProofRow
          label={t("agreement_proofs.label_proof_type")}
          value={type}
          tooltip={t("agreement_proofs.tooltip_proof_type")}
        />

        <ProofRow
          label={t("agreement_proofs.label_signee_nonce")}
          value={signeeNonce}
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
    </CardContainer>
  );
};

export default AgreementProofs;
