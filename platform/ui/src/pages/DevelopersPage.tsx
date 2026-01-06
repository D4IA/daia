import React from "react";
import SdkScreen from "../views/SdkScreen";
import SDKIntegrationSteps from "../views/SDKIntegrationSteps";
import SdkFeatures from "../views/SdkFeatures";
import CheckDocumentationView from "../views/CheckDocumentationView";

const DevelopersPage: React.FC = () => {
	return (
		<>
			<SdkScreen />
			<div id="quick-integration">
				<SDKIntegrationSteps />
			</div>
			<div id="sdk-features">
				<SdkFeatures />
			</div>
			<CheckDocumentationView />
		</>
	);
};

export default DevelopersPage;
