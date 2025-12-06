import React from "react";
import translations from "../translations/en-us.json";
import FeatureItem from "../components/FeatureItem/FeatureItem";
import CheckIcon from "../assets/check.svg";
import styles from "./WhyChooseDaia.module.scss";
import agentVisualisation from "../assets/ai-agents.jpg";

const T = translations.why_choose_daia;

const WhyChooseDAIAView: React.FC = () => {
  return (
    <section className={styles.sectionContainer}>
      <div className="contentWrapper">
        <h2 className="title">{T.title}</h2>

        <div className={styles.contentGrid}>
          <div className={styles.featuresList}>
            {T.features.map((feature, index) => (
              <FeatureItem
                key={index}
                icon={
                  <img
                    src={CheckIcon}
                    alt="Checkmark"
                    className={styles.checkIconStyle}
                  />
                }
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>

          <div className={styles.imageContainer}>
            <img
              src={agentVisualisation}
              alt="AI Agents Visualization"
              className={styles.imageStyle}
            />

            <p className={styles.sourceText}>{T.source}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseDAIAView;
