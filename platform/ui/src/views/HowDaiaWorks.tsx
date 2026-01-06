import React from "react";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import CardFeatureSection from "../components/CardFeatureSection/CardFeatureSection";
import animationStyles from "../styles/_animations.module.scss";

const HowDaiaWorks: React.FC = () => {
	const { t } = useTranslation();

	const mapCardsData = () => {
		const cardsData = t("how_daia_works.cards", {
			returnObjects: true,
		}) as any[];

		return cardsData.map((card) => ({
			id: parseInt(card.id, 10),
			iconKey: card.iconKey as any,
			title: card.title,
			description: card.description,
		}));
	};

	const cards = mapCardsData();
	const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
	const animationClass = `${animationStyles.reveal} ${animationStyles.slideRight} ${inView ? animationStyles.isVisible : ""}`;

	return (
		<div ref={ref} className={animationClass}>
			<CardFeatureSection sectionTitle={t("how_daia_works.title")} cardsData={cards} />
		</div>
	);
};

export default HowDaiaWorks;
