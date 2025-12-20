import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import DIcon from "../../assets/D.svg";
import SearchIcon from "../../assets/search.svg";
import styles from "./Navbar.module.scss";
import hamburgerSvgUrl from "../../assets/hamburger.svg";
import closeSvgUrl from "../../assets/close.svg";
import { Link, useNavigate, useLocation } from "react-router-dom";

import logoPoznanUrl from "../../assets/PoznanLogo.png";

const MenuIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} />
);

const AVAILABLE_LANGUAGES = [
  { code: "en", labelKey: "language_names.en" },
  { code: "pl", labelKey: "language_names.pl" },
  { code: "hi", labelKey: "language_names.hi" },
  { code: "pz", labelKey: "language_names.pz" },
];

const getLanguageIcon = (code: string): string => {
  switch (code) {
    case "en":
      return "🇺🇸";
    case "pl":
      return "🇵🇱";
    case "hi":
      return "🇮🇳";
    case "pz":
      return logoPoznanUrl;
    default:
      return DIcon;
  }
};

const LanguageIconRenderer: React.FC<{ code: string }> = ({ code }) => {
  const icon = getLanguageIcon(code);

  if (code === "pz") {
    return (
      <img
        src={icon}
        alt={code.toUpperCase() + " logo"}
        className={styles.langIcon}
      />
    );
  }

  return (
    <span
      className={styles.langEmoji}
      role="img"
      aria-label={code.toUpperCase()}
    >
      {icon}
    </span>
  );
};

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const { t, i18n } = useTranslation();

  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    setIsLangDropdownOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsLangDropdownOpen(false);
  };

  const toggleLangDropdown = () => {
    setIsLangDropdownOpen((prev) => !prev);
  };

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsLangDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedValue = searchValue.trim();

    if (trimmedValue) {
      navigate(`/list_of_agreements/${trimmedValue}`);
      setSearchValue("");
      closeMenu();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const hideSearch = location.pathname.startsWith("/list_of_agreements");

  const currentLangCode = i18n.language.toLowerCase();
  const displayLangCode = AVAILABLE_LANGUAGES.find(
    (lang) => lang.code === currentLangCode
  )
    ? currentLangCode
    : currentLangCode.split("-")[0];

  const LanguageDropdown: React.FC = () => (
    <div className={styles.langDropdownContainer}>
      <button
        className={`${styles.navLink} ${styles.langButton}`}
        onClick={toggleLangDropdown}
        title={t(
          AVAILABLE_LANGUAGES.find((l) => l.code === displayLangCode)
            ?.labelKey || "language_names.en"
        )}
      >
        <LanguageIconRenderer code={displayLangCode} />
      </button>

      {isLangDropdownOpen && (
        <div className={styles.langDropdownMenu}>
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`${styles.langDropdownItem} ${displayLangCode === lang.code ? styles.langActive : ""}`}
              onClick={() => changeLanguage(lang.code)}
            >
              <LanguageIconRenderer code={lang.code} />
              {t(lang.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );

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
          <Link to="/" className={styles.brandLink}>
            <img src={DIcon} alt="DAIA Icon" className={styles.iconStyle} />
            <span className={styles.brandTitleDark}>{t("navbar.title")}</span>
          </Link>
        </div>

        <div className={styles.spacer}></div>

        {!hideSearch && (
          <div className={styles.searchWrapper}>
            <form onSubmit={handleSubmit} className={styles.searchContainer}>
              <img
                src={SearchIcon}
                alt="Search"
                className={styles.searchIcon}
              />
              <input
                type="text"
                placeholder={t("navbar.button")}
                className={styles.searchInput}
                value={searchValue}
                onChange={handleSearchChange}
              />
            </form>
          </div>
        )}

        <div className={styles.linksCol}>
          <Link to="/developers" className={styles.navLink} onClick={closeMenu}>
            {t("navbar.developers")}
          </Link>
          <Link to="/about_us" className={styles.navLink} onClick={closeMenu}>
            {t("navbar.about_us")}
          </Link>
          <LanguageDropdown />
        </div>
      </div>

      <div
        className={`${styles.mobileMenu} ${
          isMenuOpen ? styles.mobileMenuOpen : ""
        }`}
      >
        {!hideSearch && (
          <form
            onSubmit={handleSubmit}
            className={styles.mobileSearchContainer}
          >
            <input
              type="text"
              placeholder={t("navbar.button")}
              className={styles.mobileSearchInput}
              value={searchValue}
              onChange={handleSearchChange}
            />
          </form>
        )}

        <Link
          to="/developers"
          className={styles.mobileNavLink}
          onClick={closeMenu}
        >
          {t("navbar.developers")}
        </Link>
        <Link
          to="/about_us"
          className={styles.mobileNavLink}
          onClick={closeMenu}
        >
          {t("navbar.about_us")}
        </Link>

        <div className={styles.mobileLangList}>
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`${styles.mobileNavLink} ${styles.langMobileItem} ${displayLangCode === lang.code ? styles.langActive : ""}`}
              onClick={() => changeLanguage(lang.code)}
            >
              <LanguageIconRenderer code={lang.code} />
              {t(lang.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
