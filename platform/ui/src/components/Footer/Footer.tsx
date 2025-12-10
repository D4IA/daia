import React from "react";
import DIcon from "../../assets/D.svg";
import styles from "./Footer.module.scss";
import translations from "../../translations/en-us.json";

const T = translations.footer;
const T_PRODUCT = T.product_col;
const T_DEVELOPERS = T.developers_col;

const Footer: React.FC = () => {
  const FooterLink: React.FC<{ href: string; children: React.ReactNode }> = ({
    href,
    children,
  }) => (
    <a href={href} className={styles.footerLink}>
      {children}
    </a>
  );

  const getProductHref = (linkText: string): string => {
    if (linkText === T_PRODUCT.links[0]) {
      return "/#how-daia-works";
    }
    if (linkText === T_PRODUCT.links[1] || linkText === T_PRODUCT.links[2]) {
      return "/oops";
    }
    return "#";
  };

  const getDevelopersHref = (linkText: string): string => {
    if (linkText === T_DEVELOPERS.links[0]) {
      return "/developers";
    }
    if (linkText === T_DEVELOPERS.links[1]) {
      return "/developers#sdk-features";
    }
    if (linkText === T_DEVELOPERS.links[2]) {
      return "/oops";
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
              <span className={styles.brandTitle}>
                {translations.navbar.title}
              </span>
            </div>
            <p className={styles.sloganText}>{T.slogan}</p>
          </div>

          <div className={styles.linkColumn}>
            <h4 className={styles.headingTitle}>{T.product_col.title}</h4>
            {T.product_col.links.map((link, index) => (
              <FooterLink key={index} href={getProductHref(link)}>
                {link}
              </FooterLink>
            ))}
          </div>

          <div className={styles.linkColumn}>
            <h4 className={styles.headingTitle}>{T.developers_col.title}</h4>
            {T.developers_col.links.map((link, index) => (
              <FooterLink key={index} href={getDevelopersHref(link)}>
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
