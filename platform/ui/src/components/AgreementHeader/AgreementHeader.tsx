import React from "react";
import styles from "./AgreementHeader.module.scss";
import { FaFilePdf } from "react-icons/fa";
import { useTranslation } from "react-i18next";

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
}

const AgreementHeader: React.FC<AgreementHeaderProps> = ({
	breadcrumbs,
	mainTitle,
	subTitle,
	createdDate,
	onGenerateReport,
}) => {
	const { t } = useTranslation();
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
				<p className={styles.createdDate}>{createdDate}</p>
			</div>
		</div>
	);
};

export default AgreementHeader;
