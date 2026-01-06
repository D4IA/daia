import React from "react";
import LandingSection from "../components/LandingSection/LandingSection";
import searchIcon from "../assets/search.svg";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LandingScreen: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const handleNavigation = () => {
		navigate("/list_of_agreements");
	};

	return (
		<LandingSection
			title={t("landing_screen.title")}
			subtitle1={t("landing_screen.subtitle_1")}
			subtitle2={t("landing_screen.subtitle_2")}
			buttonText={t("landing_screen.button")}
			buttonIcon={searchIcon}
			buttonClassName="actionButton bg-black text-white border-black hover:bg-gray-700"
			onButtonClick={handleNavigation}
		/>
	);
};

export default LandingScreen;
