import React, { useState } from "react";
import DIcon from "../../assets/D.svg";
import SearchIcon from "../../assets/search.svg";
import styles from "./Navbar.module.scss";
import translations from "../../translations/en-us.json";
import hamburgerSvgUrl from "../../assets/hamburger.svg";
import closeSvgUrl from "../../assets/close.svg";

const T = translations.navbar;

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const MenuIcon = ({ src, alt }) => <img src={src} alt={alt} />;

  return (
    <div className={styles.navbarContainer}>
      <div className={styles.contentWrapper}>
        <button className={styles.mobileMenuButton} onClick={toggleMenu}>
          {isMenuOpen ? (
            <MenuIcon src={closeSvgUrl} alt="Close menu" />
          ) : (
            <MenuIcon src={hamburgerSvgUrl} alt="Open menu" />
          )}
        </button>

        <div className={styles.logoCol}>
          <a href="#" className={styles.brandLink}>
            <img src={DIcon} alt="DAIA Icon" className={styles.iconStyle} />
            <span className={styles.brandTitleDark}>{T.title}</span>
          </a>
        </div>

        <div className={styles.spacer}></div>

        <div className={styles.searchWrapper}>
          <div className={styles.searchContainer}>
            <img src={SearchIcon} alt="Search" className={styles.searchIcon} />
            <input
              type="text"
              placeholder={T.button}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.linksCol}>
          <a href="#" className={styles.navLink}>
            {T.developers}
          </a>
          <a href="#" className={styles.navLink}>
            {T.about_us}
          </a>
        </div>
      </div>

      <div
        className={`${styles.mobileMenu} ${
          isMenuOpen ? styles.mobileMenuOpen : ""
        }`}
      >
        <a href="#" className={styles.mobileNavLink} onClick={closeMenu}>
          {T.developers}
        </a>
        <a href="#" className={styles.mobileNavLink} onClick={closeMenu}>
          {T.about_us}
        </a>
      </div>
    </div>
  );
};

export default Navbar;
