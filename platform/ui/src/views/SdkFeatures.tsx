import React from "react";
import { useTranslation } from "react-i18next";
import CardFeatureSection from "../components/CardFeatureSection/CardFeatureSection";

const SDKFeaturesView: React.FC = () => {
	const { t } = useTranslation();

	const mapSdkCardsData = () => {
		const cardsData = t("sdk_features.cards", { returnObjects: true }) as any[];

		return cardsData.map((card) => ({
			id: parseInt(card.id, 10),
			iconKey: card.iconKey as any,
			title: card.title,
			description: card.description,
		}));
	};

	const sdkCards = mapSdkCardsData();

	return (
		<CardFeatureSection
			sectionTitle={t("sdk_features.title")}
			sectionSubtitle={t("sdk_features.subtitle")}
			cardsData={sdkCards}
		/>
	);
};

export default SDKFeaturesView;
