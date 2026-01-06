import React from "react";
import { useTranslation } from "react-i18next";
import LandingSection from "../components/LandingSection/LandingSection";
import { useNavigate } from "react-router-dom";

const SDKView: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const handleNavigation = () => {
		navigate("/developers#quick-integration");
	};

	return (
		<LandingSection
			title={t("sdk_screen.title")}
			subtitle1={t("sdk_screen.subtitle_1")}
			subtitle2={t("sdk_screen.subtitle_2")}
			buttonText={t("sdk_screen.button")}
			buttonClassName="actionButton bg-black text-white border-black hover:bg-gray-700"
			onButtonClick={handleNavigation}
		/>
	);
};

export default SDKView;
