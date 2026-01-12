import React from "react";
import styles from "./AgreementHeader.module.scss";
import { FaFilePdf } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import TransactionStatusBadge from "../TransactionStatusBadge/TransactionStatusBadge";
import {BLOCKCHAIN_TRANSACTION_STATUSES} from "../TransactionStatusBadge/types"


interface BreadcrumbItem {
	label: string;
	path: string;
}

interface AgreementHeaderProps {
	breadcrumbs: BreadcrumbItem[];
	mainTitle: string;
	subTitle: string;
	createdDate: string;
	onGenerateReport: () => void;
	confirmed?: string;
}

const AgreementHeader: React.FC<AgreementHeaderProps> = ({
	breadcrumbs,
	mainTitle,
	subTitle,
	createdDate,
	onGenerateReport,
	confirmed
}) => {
	const { t } = useTranslation();

	const status = confirmed ? BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHED : BLOCKCHAIN_TRANSACTION_STATUSES.PUBLISHING;

	return (
		<div className={styles.headerWrapper}>
			<div className={styles.breadcrumbs}>
				{breadcrumbs.map((item, index) => (
					<React.Fragment key={index}>
						<a href={item.path} className={styles.breadcrumbItem}>
							{item.label}
						</a>
						{index < breadcrumbs.length - 1 && <span className={styles.separator}>&gt;</span>}
					</React.Fragment>
				))}
			</div>

			<div className={styles.buttonRow}>
				<button className={styles.pdfButton} onClick={onGenerateReport}>
					<FaFilePdf className={styles.pdfIcon} />
					{t("details_view.btn_generate_report")}
				</button>
			</div>

			<div className={styles.titles}>
				<h1 className={styles.mainTitle}>{mainTitle}</h1>
				<h2 className={styles.subTitle}>{subTitle}</h2>
				<TransactionStatusBadge status={status} />
				<p className={styles.createdDate}>{createdDate}</p>
			</div>
		</div>
	);
};

export default AgreementHeader;
