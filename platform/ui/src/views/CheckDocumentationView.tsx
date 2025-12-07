import React from "react";
import translations from "../translations/en-us.json";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./ReadyToExploreDaia.module.scss";
import { useNavigate } from "react-router-dom";

const T = translations.ready_to_explore_documentation;

const CheckDocumentationView: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = () => {
    navigate("/oops");
  };

  return (
    <section className={styles.section}>
      <div className="contentWrapper">
        <h2 className={`title ${styles.whiteTitle}`}>{T.title}</h2>
        <p className={`subtitle ${styles.whiteSubtitle}`}>{T.subtitle}</p>
        <div className="buttonContainer">
          <Button
            className="actionButton bg-white text-black border-black hover:bg-gray-700"
            onClick={handleNavigation}
          >
            <img
              src={searchIcon}
              alt="Documentation Icon"
              className="h-5 w-5 mr-2"
            />
            {T.button}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CheckDocumentationView;
