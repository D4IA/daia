import React from "react";
import CardContainer from "../AgreementDetailsCard";
import styles from "./BlockchainDetails.module.scss";
import CheckIcon from "../../../assets/check.svg";
import WaitingIcon from "../../../assets/waiting.svg";

type PublishStatus = "Publishing" | "Published";

interface OfferDetails {
  status: PublishStatus;
  transactionHash: string;
}

interface BlockchainDetailsProps {
  proposerOffer: OfferDetails;
  responderOffer: OfferDetails;
}

interface TransactionStatusProps {
  status: PublishStatus;
  transactionHash: string;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  transactionHash,
}) => {
  const getStatusInfo = (currentStatus: PublishStatus) => {
    switch (currentStatus) {
      case "Published":
        return {
          icon: CheckIcon,
          text: "Published on blockchain",
          colorClass: styles.textPublished,
        };
      case "Publishing":
        return {
          icon: WaitingIcon,
          text: "Publishing on blockchain",
          colorClass: styles.textPublishing,
        };
      default:
        return {
          icon: WaitingIcon,
          text: "Unknown status",
          colorClass: styles.textPublishing,
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className={styles.offerDetails}>
      <div className={styles.row}>
        <div className={styles.label}>Status</div>
        <div className={`${styles.statusDisplay} ${statusInfo.colorClass}`}>
          <img
            src={statusInfo.icon}
            alt={status}
            className={styles.statusIcon}
          />
          <span className={styles.statusText}>{statusInfo.text}</span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.label}>Transaction hash</div>
        <div className={styles.hashValue}>{transactionHash}</div>
      </div>
    </div>
  );
};

interface OfferDetailsCardProps {
  title: string;
  offer: OfferDetails;
}

const OfferDetailsCard: React.FC<OfferDetailsCardProps> = ({
  title,
  offer,
}) => {
  return (
    <div className={styles.offerCardWrapper}>
      <h4 className={styles.offerTitle}>{title}</h4>
      <TransactionStatus
        status={offer.status}
        transactionHash={offer.transactionHash}
      />
    </div>
  );
};

const BlockchainDetails: React.FC<BlockchainDetailsProps> = ({
  proposerOffer,
  responderOffer,
}) => {
  return (
    <CardContainer icon="blockchain" title="Blockchain details">
      <OfferDetailsCard title="Proposer offer" offer={proposerOffer} />
      <OfferDetailsCard title="Responder offer" offer={responderOffer} />
    </CardContainer>
  );
};

export default BlockchainDetails;
