import React from "react";
import LandingSection from "../components/LandingSection/LandingSection";
import translations from "../translations/en-us.json";
import searchIcon from "../assets/search.svg";
import { useNavigate } from "react-router-dom";

const T = translations.landing_screen;

const LandingScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = () => {
    navigate("/list_of_agreements");
  };

  return (
    <LandingSection
      title={T.title}
      subtitle1={T.subtitle_1}
      subtitle2={T.subtitle_2}
      buttonText={T.button}
      buttonIcon={searchIcon}
      buttonClassName="actionButton bg-black text-white border-black hover:bg-gray-700"
      onButtonClick={handleNavigation}
    />
  );
};

export default LandingScreen;
