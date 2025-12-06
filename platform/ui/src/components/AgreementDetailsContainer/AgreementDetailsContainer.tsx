import React from "react";
import AgreementMembers from "../AgreementDetailsCard/AgreementMembers/AgreementMembers";
import BlockchainDetails from "../AgreementDetailsCard/BlockchainDetails/BlockchainDetails";
import styles from "./AgreementDetailsContainer.module.scss";

// Luźniejsze typy dla danych z API
interface OfferDetails {
  status: string;
  transactionHash: string;
}

interface AgreementMember {
  address: string;
  status: "Primary" | "Secondary";
}

interface AgreementDetailsContainerProps {
  members: AgreementMember[];
  proposerOffer: OfferDetails;
  responderOffer: OfferDetails;
}

const AgreementDetailsContainer: React.FC<AgreementDetailsContainerProps> = ({
  members,
  proposerOffer,
  responderOffer,
}) => {
  return (
    <div className={styles.containerWrapper}>
      <div className={styles.detailsContent}>
        <div className={styles.membersColumn}>
          <AgreementMembers members={members} />
        </div>

        <div className={styles.blockchainColumn}>
          <BlockchainDetails
            proposerOffer={proposerOffer}
            responderOffer={responderOffer}
          />
        </div>
      </div>
    </div>
  );
};

export default AgreementDetailsContainer;
