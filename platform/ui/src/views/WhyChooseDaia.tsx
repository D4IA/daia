import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import animationStyles from "../styles/_animations.module.scss";
import FeatureItem from "../components/FeatureItem/FeatureItem";
import CheckIcon from "../assets/check.svg";
import CrossIcon from "../assets/cross.svg"; // Import nowej ikony
import styles from "./WhyChooseDaia.module.scss";

import agentVisualisation from "../assets/WithDaia.png";
import withoutDaiaVisualisation from "../assets/WithoutDaia.png";

interface Feature {
	title: string;
	description: string;
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

	const currentView = {
		title: t("why_choose_daia.title"),
		featuresKey: isWithDaia ? "why_choose_daia.features" : "why_choose_daia.features_without",
		image: isWithDaia ? agentVisualisation : withoutDaiaVisualisation,
		altKey: isWithDaia ? "alt_text.ai_agents_visualization" : "alt_text.ai_agents_broken",
	};

	const features: Feature[] = t(currentView.featuresKey, {
		returnObjects: true,
	}) as Feature[];

	return (
		<section ref={ref} className={`${styles.sectionContainer} ${animationClass}`}>
			<div className="contentWrapper">
				<h2 className="title">{currentView.title}</h2>
				<div className={styles.toggleContainer}>
					<button
						onClick={() => setIsWithDaia(true)}
						className={`${styles.toggleButton} ${isWithDaia ? styles.toggleActive : ""}`}
					>
						{t("why_choose_daia.toggle_with_daia")}
					</button>
					<button
						onClick={() => setIsWithDaia(false)}
						className={`${styles.toggleButton} ${!isWithDaia ? styles.toggleActive : ""}`}
					>
						{t("why_choose_daia.toggle_without_daia")}
					</button>
				</div>
				<div className={styles.contentGrid}>
					<div className={styles.featuresList}>
						{features.map((feature, index) => (
							<FeatureItem
								key={index}
								icon={
									<img
										src={isWithDaia ? CheckIcon : CrossIcon}
										alt="icon"
										className={isWithDaia ? styles.checkIconStyle : styles.crossIconStyle}
									/>
								}
								title={feature.title}
								description={feature.description}
							/>
						))}
					</div>

					<div className={styles.imageContainer}>
						<img src={currentView.image} alt={t(currentView.altKey)} className={styles.imageStyle} />
					</div>
				</div>
			</div>
		</section>
	);
};

export default WhyChooseDAIAView;
