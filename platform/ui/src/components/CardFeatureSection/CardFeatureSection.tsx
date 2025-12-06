import React from "react";
import Card from "../Card/Card";
import styles from "./CardFeatureSection.module.scss";

type IconKey =
  | "Negotiate"
  | "Secure"
  | "Encrypted"
  | "EncryptedBlockchainStorage"
  | "Lightweight"
  | "SimpleIntegration";

interface FeatureCardItem {
  id: number;
  iconKey: IconKey;
  title: string;
  description: string;
}

interface CardFeatureSectionProps {
  sectionTitle: string;
  sectionSubtitle?: string;
  cardsData: FeatureCardItem[];
}

const CardFeatureSection: React.FC<CardFeatureSectionProps> = ({
  sectionTitle,
  sectionSubtitle,
  cardsData,
}) => {
  return (
    <section className={styles.section}>
      <div className={`contentWrapper ${styles.contentWrapper}`}>
        <h2 className={`title ${styles.sectionTitle}`}>{sectionTitle}</h2>

        {sectionSubtitle && <p className="subtitle">{sectionSubtitle}</p>}

        <div className={styles.cardsGrid}>
          {cardsData.map((card) => (
            <Card key={card.id} data={card} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CardFeatureSection;
