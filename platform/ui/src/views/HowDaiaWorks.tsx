import React from "react";
import CardFeatureSection from "../components/CardFeatureSection/CardFeatureSection"; 
import translations from "../translations/en-us.json";

const T = translations.how_daia_works;

const mapCardsData = () => {
  return T.cards.map((card) => ({
    id: parseInt(card.id, 10),
    iconKey: card.iconKey as any,
    title: card.title,
    description: card.description,
  }));
};

const HowDaiaWorks: React.FC = () => {
  const cards = mapCardsData();

  return <CardFeatureSection sectionTitle={T.title} cardsData={cards} />;
};

export default HowDaiaWorks;
