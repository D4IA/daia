import React from "react";
import LandingScreen from "../views/LandingScreen";
import HowDaiaWorks from "../views/HowDaiaWorks";
import SearchForYourAgreementView from "../views/SearchForYourAgreement";
import WhyChooseDAIAView from "../views/WhyChooseDaia";
import ReadyToExploreDaia from "../views/ReadyToExploreDaia";

const HomePage: React.FC = () => {
  return (
    <>
      <LandingScreen />
      <div id="how-daia-works">
        <HowDaiaWorks />
      </div>
      <SearchForYourAgreementView />
      <WhyChooseDAIAView />
      <ReadyToExploreDaia />
    </>
  );
};

export default HomePage;
