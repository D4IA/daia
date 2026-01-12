import React from "react";
import styles from "./TransactionStatusBadge.module.scss";
import { useTranslation } from "react-i18next";

import CheckIcon from "../../assets/check.svg";
import CloseIcon from "../../assets/close.svg";
import WaitingIcon from "../../assets/waiting.svg";
import { BLOCKCHAIN_TRANSACTION_STATUSES, type TransactionStatus } from "./types";

interface TransactionStatusBadgeProps {
	status: TransactionStatus;
	className?: string;
}

const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({ status, className }) => {
	const { t } = useTranslation();

	const getStatusInfo = (currentStatus: TransactionStatus) => {
		switch (currentStatus) {
			case BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHED:
				return {
					icon: CheckIcon,
					text: t("agreement_list.status_published"),
					badgeClass: styles.badgeSuccess,
					colorClass: styles.textSuccess,
				};
			case BLOCKCHAIN_TRANSACTION_STATUSES.FAILED:
				return {
					icon: CloseIcon,
					text: t("agreement_list.status_failed"),
					badgeClass: styles.badgeFailed,
					colorClass: styles.textFailed,
				};
			case BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHING:
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
	const isSpinning = status === BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHING;

	return (
		<>
			<span className={`${styles.statusBadge} ${statusInfo.badgeClass} ${className || ""}`}>
				<img
					src={statusInfo.icon}
					alt={status}
					className={`${styles.statusIconImage} ${isSpinning ? styles.spin : ""}`}
				/>
				<span className={styles.statusText}>{statusInfo.text}</span>
			</span>
			<div className={`${styles.mobileStatusText} ${statusInfo.colorClass}`}>{statusInfo.text}</div>
		</>
	);
};

export default TransactionStatusBadge;
