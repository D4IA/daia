import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import animationStyles from "../styles/_animations.module.scss";
import FeatureItem from "../components/FeatureItem/FeatureItem";
import CheckIcon from "../assets/check.svg";
import styles from "./WhyChooseDaia.module.scss";

import agentVisualisation from "../assets/WithDaia.png";

import withoutDaiaVisualisation from "../assets/WithoutDaia.png";

interface Feature {
  title: string;
  description: string;
}

interface ViewContent {
  title: string;
  featuresKey: string;
  image: string;
  altKey: string;
  sourceKey: string;
  layoutClass: string;
}

const WhyChooseDAIAView: React.FC = () => {
  const { t } = useTranslation();
  const [isWithDaia, setIsWithDaia] = useState(true);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const animationClass = `${animationStyles.reveal} ${
    animationStyles.slideRight
  } ${inView ? animationStyles.isVisible : ""}`;

  const VIEWS: { [key: string]: ViewContent } = {
    withDaia: {
      title: t("why_choose_daia.title_with_daia", "Why Choose DAIA?"),
      featuresKey: "why_choose_daia.features",
      image: agentVisualisation,
      altKey: "alt_text.ai_agents_visualization",
      sourceKey: "why_choose_daia.source",
      layoutClass: styles.gridDefault,
    },
    withoutDaia: {
      title: t("why_choose_daia.title_without_daia", "Without DAIA"),
      featuresKey: "why_choose_daia.features_without",
      image: withoutDaiaVisualisation,
      altKey: "alt_text.ai_agents_broken",
      sourceKey: "why_choose_daia.source_without",
      layoutClass: styles.gridReversed,
    },
  };

  const currentView = isWithDaia ? VIEWS.withDaia : VIEWS.withoutDaia;

  const features: Feature[] = t(currentView.featuresKey, {
    returnObjects: true,
  }) as Feature[];

  const ToggleButton: React.FC = () => (
    <div className={styles.toggleContainer}>
      <button
        onClick={() => setIsWithDaia(true)}
        className={`${styles.toggleButton} ${isWithDaia ? styles.toggleActive : ""}`}
      >
        {t("why_choose_daia.toggle_with_daia", "With DAIA")}
      </button>
      <button
        onClick={() => setIsWithDaia(false)}
        className={`${styles.toggleButton} ${!isWithDaia ? styles.toggleActive : ""}`}
      >
        {t("why_choose_daia.toggle_without_daia", "Without DAIA")}
      </button>
    </div>
  );

  return (
    <section
      ref={ref}
      className={`${styles.sectionContainer} ${animationClass}`}
    >
      <div className="contentWrapper">
        <h2 className="title">{currentView.title}</h2>
        <ToggleButton />

        <div className={`${styles.contentGrid} ${currentView.layoutClass}`}>
          <div className={styles.featuresList}>
            {features.map((feature, index) => (
              <FeatureItem
                key={index}
                icon={
                  <img
                    src={CheckIcon}
                    alt={t("alt_text.checkmark", "Checkmark")}
                    className={`${styles.checkIconStyle} ${!isWithDaia ? styles.crossIconStyle : ""}`}
                  />
                }
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>

          <div className={styles.imageContainer}>
            <img
              src={currentView.image}
              alt={t(currentView.altKey, "Visualization")}
              className={styles.imageStyle}
            />

            <p className={styles.sourceText}>
              {t(currentView.sourceKey, currentView.image)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseDAIAView;
