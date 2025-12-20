import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./SearchForYourAgreement.module.scss";
import animationStyles from "../styles/_animations.module.scss";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";

const SearchForYourAgreementView: React.FC = () => {
  const { t } = useTranslation();

  const ERROR_MESSAGE = t("search_agreement.error_empty");

  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const animationClass = `${animationStyles.reveal} ${
    animationStyles.slideLeft
  } ${inView ? animationStyles.isVisible : ""}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) {
      setError(ERROR_MESSAGE);
      return;
    }
    setError(null);
    navigate(`/list_of_agreements/${query}`);
  };

  return (
    <section className={styles.section}>
      <div ref={ref} className={`${styles.contentWrapper} ${animationClass}`}>
        <h2 className="title">{t("search_view.title")}</h2>

        <p className="subtitle">{t("search_view.subtitle")}</p>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <input
            type="text"
            placeholder={t("search_view.placeholder")}
            value={inputValue}
            onChange={handleInputChange}
            className={styles.inputField}
          />

          <Button className={styles.actionButton}>
            <img
              src={searchIcon}
              alt={t("search_view.button_alt", "Search Icon")}
              className={styles.icon}
            />
            {t("search_view.button")}
          </Button>
        </form>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    </section>
  );
};

export default SearchForYourAgreementView;
