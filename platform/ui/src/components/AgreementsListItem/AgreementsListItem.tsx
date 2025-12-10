import React from "react";
import styles from "./AgreementsListItem.module.scss";

import CheckIcon from "../../assets/check.svg";
import CloseIcon from "../../assets/close.svg";
import WaitingIcon from "../../assets/waiting.svg";

type AgreementStatus = "Published" | "Failed" | "Verifying";

interface AgreementListItemProps {
  title: string;
  date: string;
  status: AgreementStatus;
  txId: string;
  onClick?: () => void;
}

const AgreementListItem: React.FC<AgreementListItemProps> = ({
  date,
  status,
  txId,
  onClick,
}) => {
  const getStatusInfo = (currentStatus: AgreementStatus) => {
    switch (currentStatus) {
      case "Published":
        return {
          icon: CheckIcon,
          text: "Published on blockchain",
          colorClass: styles.textSuccess,
          badgeClass: styles.badgeSuccess,
        };
      case "Failed":
        return {
          icon: CloseIcon,
          text: "Failed to publish on blockchain",
          colorClass: styles.textFailed,
          badgeClass: styles.badgeFailed,
        };
      case "Verifying":
        return {
          icon: WaitingIcon,
          text: "Verifying on blockchain",
          colorClass: styles.textVerifying,
          badgeClass: styles.badgeVerifying,
        };
      default:
        return {
          icon: WaitingIcon,
          text: "Unknown status",
          colorClass: styles.textDefault,
          badgeClass: styles.badgeDefault,
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  const formatTxId = (hash: string) => {
    if (!hash) return "";
    return hash;
  };

  const mainTxIdDisplay = formatTxId(txId);

  return (
    <div className={styles.itemContainer} onClick={onClick}>
      <div className={styles.itemContent}>
        <div className={styles.mainInfo}>
          <span className={styles.titleText} title={txId}>
            {mainTxIdDisplay}
          </span>

          <span className={`${styles.statusBadge} ${statusInfo.badgeClass}`}>
            <img
              src={statusInfo.icon}
              alt={status}
              className={styles.statusIconImage}
            />
            <span className={styles.statusText}>{statusInfo.text}</span>
          </span>
        </div>
        <div className={`${styles.mobileStatusText} ${statusInfo.colorClass}`}>
          {statusInfo.text}
        </div>

        <div className={styles.metaDataWrapper}>
          <div className={styles.dateText}>{date}</div>
        </div>
      </div>

      <svg className={styles.arrowIcon} viewBox="0 0 24 24">
        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
      </svg>
    </div>
  );
};

export default AgreementListItem;
