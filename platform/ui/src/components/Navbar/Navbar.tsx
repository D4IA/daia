import React, { useState } from "react";
import DIcon from "../../assets/D.svg";
import SearchIcon from "../../assets/search.svg";
import styles from "./Navbar.module.scss";
import translations from "../../translations/en-us.json";
import hamburgerSvgUrl from "../../assets/hamburger.svg";
import closeSvgUrl from "../../assets/close.svg";
import { Link, useNavigate, useLocation } from "react-router-dom";

const T = translations.navbar;

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const MenuIcon = ({ src, alt }) => <img src={src} alt={alt} />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedValue = searchValue.trim();

    if (trimmedValue) {
      navigate(`/list_of_agreements/${trimmedValue}`);
      setSearchValue("");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const hideSearch = location.pathname.startsWith("/list_of_agreements");

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
            <span className={styles.brandTitleDark}>{T.title}</span>
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
                placeholder={T.button}
                className={styles.searchInput}
                value={searchValue}
                onChange={handleSearchChange}
              />
            </form>
          </div>
        )}

        <div className={styles.linksCol}>
          <Link to="/developers" className={styles.navLink}>
            {T.developers}
          </Link>
          <a href="/oops" className={styles.navLink}>
            {T.about_us}
          </a>
        </div>
      </div>

      <div
        className={`${styles.mobileMenu} ${
          isMenuOpen ? styles.mobileMenuOpen : ""
        }`}
      >
        <Link
          to="/developers"
          className={styles.mobileNavLink}
          onClick={closeMenu}
        >
          {T.developers}
        </Link>
        <a href="#" className={styles.mobileNavLink} onClick={closeMenu}>
          {T.about_us}
        </a>
      </div>
    </div>
  );
};

export default Navbar;
