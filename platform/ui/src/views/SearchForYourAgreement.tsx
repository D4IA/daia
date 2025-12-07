import React, { useState } from "react";
import translations from "../translations/en-us.json";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./SearchForYourAgreement.module.scss";
import { useNavigate } from "react-router-dom";

const T = translations.search_view;
const ERROR_MESSAGE = translations.search_agreement.error_empty;

const SearchForYourAgreementView: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
      <div className={styles.contentWrapper}>
        <h2 className="title">{T.title}</h2>

        <p className="subtitle">{T.subtitle}</p>

        <form onSubmit={handleSubmit} className={styles.formContainer}>
          <input
            type="text"
            placeholder={T.placeholder}
            value={inputValue}
            onChange={handleInputChange}
            className={styles.inputField}
          />

          <Button className={styles.actionButton}>
            <img src={searchIcon} alt="Search Icon" className={styles.icon} />
            {T.button}
          </Button>
        </form>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    </section>
  );
};

export default SearchForYourAgreementView;
