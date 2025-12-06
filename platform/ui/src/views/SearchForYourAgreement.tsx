import React, { useState } from "react";
import translations from "../translations/en-us.json";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./SearchForYourAgreement.module.scss";

const T = translations.search_view;

const SearchForYourAgreementView: React.FC = () => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", inputValue);
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
            onChange={(e) => setInputValue(e.target.value)}
            className={styles.inputField}
          />

          <Button className={styles.actionButton}>
            <img src={searchIcon} alt="Search Icon" className={styles.icon} />
            {T.button}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default SearchForYourAgreementView;
