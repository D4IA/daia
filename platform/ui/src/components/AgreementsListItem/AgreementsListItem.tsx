import React from "react";
import styles from "./AgreementsListItem.module.scss";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  const getStatusInfo = (currentStatus: AgreementStatus) => {
    switch (currentStatus) {
      case "Published":
        return {
          icon: CheckIcon,
          text: t("agreement_list.status_published"),
          badgeClass: styles.badgeSuccess,
          colorClass: styles.textSuccess,
        };
      case "Failed":
        return {
          icon: CloseIcon,
          text: t("agreement_list.status_failed"),
          badgeClass: styles.badgeFailed,
          colorClass: styles.textFailed,
        };
      case "Verifying":
        return {
          icon: WaitingIcon,
          text: t("agreement_list.status_verifying"),
          badgeClass: styles.badgeVerifying,
          colorClass: styles.textVerifying,
        };
      default:
        return {
          icon: WaitingIcon,
          text: t("agreement_list.status_unknown"),
          badgeClass: styles.badgeDefault,
          colorClass: styles.textDefault,
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className={styles.itemContainer} onClick={onClick}>
      <div className={styles.itemContent}>
        <div className={styles.mainInfo}>
          <span className={styles.titleText} title={txId}>
            {txId}
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
