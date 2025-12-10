import React, { ReactNode } from "react";
import styles from "./AgreementDetailsCard.module.scss";
import { FaUserFriends, FaLink, FaLock, FaBook } from "react-icons/fa";

const getIcon = (
  iconType: "members" | "blockchain" | "document" | "lock" | "book"
) => {
  switch (iconType) {
    case "members":
      return <FaUserFriends className={styles.icon} />;
    case "blockchain":
      return <FaLink className={styles.icon} />;
    case "document":
      return <FaUserFriends className={styles.icon} />;
    case "lock":
      return <FaLock className={styles.icon} />;
    case "book":
      return <FaBook className={styles.icon} />;
    default:
      return null;
  }
};

interface CardContainerProps {
  icon: "members" | "blockchain" | "document" | "lock";
  title: string;
  children: ReactNode;
}

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
