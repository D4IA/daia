import React, { type ReactNode } from "react";
import styles from "./FeatureItem.module.scss";

interface FeatureItemProps {
  title: string;
  description: string;
  icon: ReactNode;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  title,
  description,
  icon,
}) => {
  return (
    <div className={styles.itemContainer}>
      <div className={styles.iconWrapper}>{icon}</div>

      <div className={styles.textContainer}>
        <h3 className={styles.titleText}>{title}</h3>
        <p className={styles.descriptionText}>{description}</p>
      </div>
    </div>
  );
};

export default FeatureItem;
