import React from "react";
import { useTranslation } from "react-i18next";
import DIcon from "../../assets/D.svg";
import styles from "./Footer.module.scss";

const Footer: React.FC = () => {
	const { t } = useTranslation();

	const FooterLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
		const isExternal = href.startsWith("http");

		return (
			<a
				href={href}
				className={styles.footerLink}
				target={isExternal ? "_blank" : undefined}
				rel={isExternal ? "noopener noreferrer" : undefined}
			>
				{children}
			</a>
		);
	};

	const productLinks = t("footer.product_col.links", {
		returnObjects: true,
	}) as string[];
	const developersLinks = t("footer.developers_col.links", {
		returnObjects: true,
	}) as string[];

	const getProductHref = (linkText: string): string => {
		if (linkText === productLinks[0]) {
			return "/#how-daia-works";
		}
		if (linkText === productLinks[1]) {
			return "/about_us";
		}
		if (linkText === productLinks[2]) {
			return "/support";
		}
		return "#";
	};

	const getDevelopersHref = (linkText: string): string => {
		if (linkText === developersLinks[0]) {
			return "/developers";
		}
		if (linkText === developersLinks[1]) {
			return "/developers#sdk-features";
		}
		if (linkText === developersLinks[2]) {
			return "http://daiadocs.teawithsand.com";
		}
		return "#";
	};

	return (
		<footer className={styles.footerContainerWhite}>
			<div className={styles.contentWrapper}>
				<div className={styles.topSection}>
					<div className={styles.brandColumn}>
						<div className={styles.logoWrapper}>
							<img src={DIcon} alt="DAIA Icon" className={styles.iconStyle} />
							<span className={styles.brandTitle}>{t("navbar.title")}</span>
						</div>
						<p className={styles.sloganText}>{t("footer.slogan")}</p>
					</div>

					<div className={styles.linkColumn}>
						<h4 className={styles.headingTitle}>{t("footer.product_col.title")}</h4>
						{productLinks.map((link, index) => (
							<FooterLink key={index} href={getProductHref(link)}>
								{link}
							</FooterLink>
						))}
					</div>

					<div className={styles.linkColumn}>
						<h4 className={styles.headingTitle}>{t("footer.developers_col.title")}</h4>
						{developersLinks.map((link, index) => (
							<FooterLink key={index} href={getDevelopersHref(link)}>
								{link}
							</FooterLink>
						))}
					</div>
				</div>

				<div className={styles.copyrightText}>{t("footer.copyright")}</div>
			</div>
		</footer>
	);
};

export default Footer;
