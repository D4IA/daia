import React from "react";
import CardFeatureSection from "../components/CardFeatureSection/CardFeatureSection";
import translations from "../translations/en-us.json";

const T = translations.sdk_features;

const mapSdkCardsData = () => {
  return T.cards.map((card) => ({
    id: parseInt(card.id, 10),
    iconKey: card.iconKey as any,
    title: card.title,
    description: card.description,
  }));
};

const SDKFeaturesView: React.FC = () => {
  const sdkCards = mapSdkCardsData();

  return (
    <CardFeatureSection
      sectionTitle={T.title}
      sectionSubtitle={T.subtitle}
      cardsData={sdkCards}
    />
  );
};

export default SDKFeaturesView;
