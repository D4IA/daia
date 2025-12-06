import React from "react";
import translations from "../translations/en-us.json";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./ReadyToExploreDaia.module.scss";

const T = translations.explore_section;

const ReadyToExploreDaia: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className="contentWrapper">
        <h2 className={`title ${styles.whiteTitle}`}>{T.title}</h2>
        <p className={`subtitle ${styles.whiteSubtitle}`}>{T.subtitle}</p>
        <div className="buttonContainer">
          <Button className="actionButton bg-white text-black border-black hover:bg-gray-700">
            <img src={searchIcon} alt="Search Icon" className="h-5 w-5 mr-2" />
            {T.button}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ReadyToExploreDaia;
