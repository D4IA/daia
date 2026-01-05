import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./ReadyToExploreDaia.module.scss";

const CheckDocumentationView: React.FC = () => {
  const { t } = useTranslation();

  const handleNavigation = () => {
    window.open(
      "https://daiadocs.teawithsand.com",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section className={styles.section}>
      <div className="contentWrapper">
        <h2 className={`title ${styles.whiteTitle}`}>
          {t("ready_to_explore_documentation.title")}
        </h2>
        <p className={`subtitle ${styles.whiteSubtitle}`}>
          {t("ready_to_explore_documentation.subtitle")}
        </p>

        <div className="buttonContainer">
          <Button
            className="actionButton bg-white text-black border-black hover:bg-gray-700"
            onClick={handleNavigation}
          >
            <img
              src={searchIcon}
              alt={t("alt_text.documentation_icon", "Documentation Icon")}
              className="h-5 w-5 mr-2"
            />
            {t("ready_to_explore_documentation.button")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CheckDocumentationView;
