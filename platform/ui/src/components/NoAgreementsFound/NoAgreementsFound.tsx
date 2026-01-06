import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./NoAgreementsFound.module.scss";
import OopsIcon from "../../assets/oops.svg";

const NoAgreementsFound: React.FC = () => {
	const { t } = useTranslation();
	return (
		<div className={styles.container}>
			<img src={OopsIcon} alt="No agreements found" className={styles.icon} />

			<h3 className={styles.title}>{t("no_agreements_found.title")}</h3>

			<p className={styles.description}>{t("no_agreements_found.description")}</p>
		</div>
	);
};

export default NoAgreementsFound;
