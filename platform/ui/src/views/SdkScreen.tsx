import React from "react";
import LandingSection from "../components/LandingSection/LandingSection";
import translations from "../translations/en-us.json";

const T = translations.sdk_screen;

const SDKView: React.FC = () => {
  return (
    <LandingSection
      title={T.title}
      subtitle1={T.subtitle_1}
      subtitle2={T.subtitle_2}
      buttonText={T.button}
      buttonClassName="actionButton bg-black text-white border-black hover:bg-gray-700"
      onButtonClick={() => console.log("SDK button clicked")}
    />
  );
};

export default SDKView;
