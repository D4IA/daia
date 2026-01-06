import React from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import animationStyles from "../styles/_animations.module.scss";
import Button from "../components/Button/Button";
import searchIcon from "../assets/search.svg";
import styles from "./ReadyToExploreDaia.module.scss";
import { useNavigate } from "react-router-dom";

const ReadyToExploreDaia: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [ref, inView] = useInView({
		triggerOnce: true,
		threshold: 0.1,
	});

	const animationClass = `${animationStyles.reveal} ${
		animationStyles.fadeUp
	} ${inView ? animationStyles.isVisible : ""}`;

	const handleNavigation = () => {
		navigate("/list_of_agreements");
	};

	return (
		<section ref={ref} className={`${styles.section} ${animationClass}`}>
			<div className="contentWrapper">
				<h2 className={`title ${styles.whiteTitle}`}>{t("explore_section.title")}</h2>

				<p className={`subtitle ${styles.whiteSubtitle}`}>{t("explore_section.subtitle")}</p>

				<div className="buttonContainer">
					<Button
						className="actionButton bg-white text-black border-black hover:bg-gray-700"
						onClick={handleNavigation}
					>
						<img
							src={searchIcon}
							alt={t("explore_section.button_alt", "Search Icon")}
							className="h-5 w-5 mr-2"
						/>
						{t("explore_section.button")}
					</Button>
				</div>
			</div>
		</section>
	);
};

export default ReadyToExploreDaia;
