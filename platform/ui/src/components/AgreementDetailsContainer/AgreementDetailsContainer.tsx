import React from "react";
import AgreementRequirements from "../AgreementDetailsCard/AgreementRequirements/AgreementRequirements";
import AgreementProofs from "../AgreementDetailsCard/AgreementProofs/AgreementProofs";
import styles from "./AgreementDetailsContainer.module.scss";

interface AgreementDetailsContainerProps {
  requirements: any;
  proofs: any;
}

const AgreementDetailsContainer: React.FC<AgreementDetailsContainerProps> = ({
  requirements,
  proofs,
}) => {
  return (
    <div className={styles.detailsContent}>
      <div className={styles.requirementsColumn}>
        <AgreementRequirements requirements={requirements} />
      </div>

      <div className={styles.proofsColumn}>
        <AgreementProofs proofs={proofs} />
      </div>
    </div>
  );
};

export default AgreementDetailsContainer;
