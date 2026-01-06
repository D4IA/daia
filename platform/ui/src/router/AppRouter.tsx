import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import HomePage from "../pages/HomePage";
import DevelopersPage from "../pages/DevelopersPage";
import AgreementDetailsPage from "../pages/AgreementDetailsPage";
import AgreementListView from "../views/AgreementListView";
import AboutUsView from "../views/AboutUsView";
import SupportView from "../views/SupportView";
import NotFoundPage from "../pages/NotFoundPage";

const AppRouter: React.FC = () => {
	const location = useLocation();

	const handleAgreementSearch = (walletAddress: string) => {
		console.log("Searching for agreements by wallet:", walletAddress);
	};

	useEffect(() => {
		if (location.hash) {
			const id = location.hash.substring(1);
			const element = document.getElementById(id);

			if (element) {
				setTimeout(() => {
					element.scrollIntoView({ behavior: "smooth" });
				}, 100);
			}
		} else {
			window.scrollTo(0, 0);
		}
	}, [location.pathname, location.hash]);

	return (
		<Routes>
			<Route path="/" element={<HomePage />} />
			<Route
				path="/list_of_agreements/:query?"
				element={<AgreementListView onSearch={handleAgreementSearch} />}
			/>
			<Route path="/developers" element={<DevelopersPage />} />
			<Route path="/agreement_details/:txId" element={<AgreementDetailsPage />} />
			<Route path="/oops" element={<NotFoundPage />} />
			<Route path="/about_us" element={<AboutUsView />} />
			<Route path="/support" element={<SupportView />} />
		</Routes>
	);
};

export default AppRouter;
