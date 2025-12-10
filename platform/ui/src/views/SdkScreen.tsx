import React from "react";
import LandingSection from "../components/LandingSection/LandingSection";
import translations from "../translations/en-us.json";
import { useNavigate } from "react-router-dom";

const T = translations.sdk_screen;

const SDKView: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigation = () => {
    navigate("/developers#quick-integration");
  };

  return (
    <LandingSection
      title={T.title}
      subtitle1={T.subtitle_1}
      subtitle2={T.subtitle_2}
      buttonText={T.button}
      buttonClassName="actionButton bg-black text-white border-black hover:bg-gray-700"
      onButtonClick={handleNavigation}
    />
  );
};

export default SDKView;
