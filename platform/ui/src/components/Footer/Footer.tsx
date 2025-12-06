import React from "react";
import DIcon from "../../assets/D.svg";
import styles from "./Footer.module.scss";
import translations from "../../translations/en-us.json";

const T = translations.footer;

const Footer: React.FC = () => {
  const FooterLink: React.FC<{ href: string; children: React.ReactNode }> = ({
    href,
    children,
  }) => (
    <a href={href} className={styles.footerLink}>
      {children}
    </a>
  );

  return (
    <footer className={styles.footerContainerWhite}>
      <div className={styles.contentWrapper}>
        <div className={styles.topSection}>
          <div className={styles.brandColumn}>
            <div className={styles.logoWrapper}>
              <img src={DIcon} alt="DAIA Icon" className={styles.iconStyle} />
              <span className={styles.brandTitle}>
                {translations.navbar.title}
              </span>
            </div>
            <p className={styles.sloganText}>{T.slogan}</p>
          </div>

          <div className={styles.linkColumn}>
            <h4 className={styles.headingTitle}>{T.product_col.title}</h4>
            {T.product_col.links.map((link, index) => (
              <FooterLink
                key={index}
                href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
              >
                {link}
              </FooterLink>
            ))}
          </div>

          <div className={styles.linkColumn}>
            <h4 className={styles.headingTitle}>{T.developers_col.title}</h4>
            {T.developers_col.links.map((link, index) => (
              <FooterLink
                key={index}
                href={`#${link.toLowerCase().replace(/\s/g, "-")}`}
              >
                {link}
              </FooterLink>
            ))}
          </div>
        </div>

        <div className={styles.copyrightText}>{T.copyright}</div>
      </div>
    </footer>
  );
};

export default Footer;
