import React from "react";
import { useTranslation } from "react-i18next";
import LandingSection from "../components/LandingSection/LandingSection";
import searchIcon from "../assets/search.svg";
import { useNavigate } from "react-router-dom";

const AboutUsLandingScreen: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const handleNavigation = () => {
		navigate("/list_of_agreements");
	};

	const title = t("about_us_view.main_title");
	const subtitle1 = t("about_us_view.subtitle_1");
	const subtitle2 = t("about_us_view.subtitle_2");
	return (
		<LandingSection
			title={title}
			subtitle1={subtitle1}
			subtitle2={subtitle2}
			buttonText={t("explore_section.button")}
			buttonIcon={searchIcon}
			buttonClassName="actionButton bg-black text-white border-black hover:bg-gray-700"
			onButtonClick={handleNavigation}
		/>
	);
};

export default AboutUsLandingScreen;
