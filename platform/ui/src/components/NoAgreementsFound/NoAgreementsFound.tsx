import React from "react";
import styles from "./NoAgreementsFound.module.scss";
import OopsIcon from "../../assets/oops.svg";
import translations from "../../translations/en-us.json";

const T = translations.no_agreements_found;
const NoAgreementsFound: React.FC = () => {
  return (
    <div className={styles.container}>
      <img src={OopsIcon} alt="No agreements found" className={styles.icon} />

      <h3 className={styles.title}>{T.title}</h3>

      <p className={styles.description}>{T.description}</p>
    </div>
  );
};

export default NoAgreementsFound;
