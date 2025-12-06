import React, { ReactNode } from "react";
import styles from "./AgreementDetailsCard.module.scss";
import { FaUserFriends, FaLink } from "react-icons/fa";

interface CardContainerProps {
  icon: "members" | "blockchain";
  title: string;
  children: ReactNode;
}

const getIcon = (iconType: "members" | "blockchain") => {
  switch (iconType) {
    case "members":
      return <FaUserFriends className={styles.icon} />;
    case "blockchain":
      return <FaLink className={styles.icon} />;
    default:
      return null;
  }
};

const CardContainer: React.FC<CardContainerProps> = ({
  icon,
  title,
  children,
}) => {
  return (
    <div className={styles.cardWrapper}>
      <div className={styles.cardHeader}>
        {getIcon(icon)}
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
};

export default CardContainer;
