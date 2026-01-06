import React from "react";
import AgreementsListSearchBar from "../components/AgreementsListSearchBar/AgreementsListSearchBar";
import NoAgreementsFound from "../components/NoAgreementsFound/NoAgreementsFound";

const NotFoundPage: React.FC = () => {
	const handleAgreementSearch = (walletAddress: string) => {
		console.log("Searching for agreements by wallet:", walletAddress);
	};

	return (
		<>
			<AgreementsListSearchBar onSearch={handleAgreementSearch} onErrorChange={() => {}} />
			<NoAgreementsFound />
		</>
	);
};

export default NotFoundPage;
