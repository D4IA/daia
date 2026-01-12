import React from "react";
import styles from "./AgreementsListItem.module.scss";
import TransactionStatusBadge from "../TransactionStatusBadge/TransactionStatusBadge";
import {
	BLOCKCHAIN_TRANSACTION_STATUSES,
	type TransactionStatus,
} from "../TransactionStatusBadge/types";

type AgreementStatus = "Published" | "Failed" | "Verifying";

interface AgreementListItemProps {
	title: string;
	date: string;
	status: AgreementStatus;
	txId: string;
	onClick?: () => void;
}

const AgreementListItem: React.FC<AgreementListItemProps> = ({ date, status, txId, onClick }) => {
	const mapStatus = (status: AgreementStatus): TransactionStatus => {
		switch (status) {
			case "Published":
				return BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHED;
			case "Failed":
				return BLOCKCHAIN_TRANSACTION_STATUSES.FAILED;
			case "Verifying":
			default:
				return BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHING;
		}
	};

	return (
		<div className={styles.itemContainer} onClick={onClick}>
			<div className={styles.itemContent}>
				<div className={styles.mainInfo}>
					<span className={styles.titleText} title={txId}>
						{txId}
					</span>

					<TransactionStatusBadge status={mapStatus(status)} />
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
