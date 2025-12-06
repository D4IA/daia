import React, { useEffect, useState } from "react";
import "./App.css";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AgreementHeader from "./components/AgreementHeader/AgreementHeader";
import AgreementDetailsContainer from "./components/AgreementDetailsContainer/AgreementDetailsContainer";
import NegotiationTimeline from "./components/NegotiateTimeline/NegotiationTimeline";
import AgreementsListSearchBar from "./components/AgreementsListSearchBar/AgreementsListSearchBar";
import NoAgreementsFound from "./components/NoAgreementsFound/NoAgreementsFound";

import HowDaiaWorks from "./views/HowDaiaWorks";
import SearchForYourAgreementView from "./views/SearchForYourAgreement";
import WhyChooseDAIAView from "./views/WhyChooseDaia";
import ReadyToExploreDaia from "./views/ReadyToExploreDaia";
import LandingScreen from "./views/LandingScreen";
import AgreementListView from "./views/AgreementListView";
import SdkScreen from "./views/SdkScreen";
import SdkFeatures from "./views/SdkFeatures";
import SDKIntegrationSteps from "./views/SDKIntegrationSteps";

import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";

const API_BASE_URL = "http://localhost:3000";
const DEMO_WALLET_ADDRESS = "mnqfyNfFeDLtfzNQEUkzqKdxSyJ5cSyixW";


interface TimelineEvent {
  id: string;
  title: string;
  action: string;
  timestamp: string;
  txId: string;
  isSigned: boolean;
  colorClass?: "colorPurple" | "colorGreen";
}

interface ApiOfferContent {
  naturalLanguageOfferContent: string;
  requirements?: {
    req_signature?: {
      pubKey?: string;
    };
  };
}

interface ApiAgreementItem {
  offerContent: ApiOfferContent;
  proofs?: any;
  vout: number;
}

interface ApiTransaction {
  txId: string;
  timestamp: number;
  agreements: ApiAgreementItem[];
}

interface ApiResponse {
  address: string;
  transactions: ApiTransaction[];
}

const AgreementDetailsPage = () => {
  const { txId } = useParams();

  const [transactionData, setTransactionData] = useState<ApiTransaction | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!txId) return;
      setLoading(true);
      setError(null);

      try {
        console.log(
          `Fetching agreements for demo address to find TxID: ${txId}`,
        );
        const response = await fetch(
          `${API_BASE_URL}/agreements/${DEMO_WALLET_ADDRESS}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch agreements (Status: ${response.status})`,
          );
        }

        const data: ApiResponse = await response.json();

        const foundTx = data.transactions.find((tx) => tx.txId === txId);

        if (foundTx) {
          setTransactionData(foundTx);
        } else {
          throw new Error("Transaction not found in the demo wallet history.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load transaction details.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [txId]);

  const handleGenerateReport = () => {
    console.log(`Generowanie raportu PDF dla TxID: ${txId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">
          Loading details...
        </div>
      </div>
    );
  }

  if (error || !transactionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold text-red-500">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }


  const firstAgreement = transactionData.agreements[0];
  const mainTitle =
    firstAgreement?.offerContent.naturalLanguageOfferContent ||
    "Unknown Content";

  const dateStr = new Date(transactionData.timestamp * 1000).toLocaleString(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

  const breadcrumbsData = [
    { label: "Agreements search", path: "/list_of_agreements" },
    { label: `Transaction ${txId?.substring(0, 6)}...`, path: "#" },
  ];

  const proposerPubKey =
    firstAgreement?.offerContent?.requirements?.req_signature?.pubKey;
  const shortProposer = proposerPubKey
    ? `${proposerPubKey.substring(0, 15)}...`
    : "Unknown Proposer";

  const members = [
    { address: shortProposer, status: "Primary" as const },
    { address: "Responder (Signed)", status: "Secondary" as const },
  ];

  const blockchainInfo = {
    status: "Published",
    transactionHash: transactionData.txId,
  };

  const timelineEvents: TimelineEvent[] = transactionData.agreements.map(
    (agr, index) => ({
      id: `${transactionData.txId}-${agr.vout || index}`,
      title: agr.offerContent.naturalLanguageOfferContent,
      action: agr.proofs ? "Agreement Signed" : "Offer Proposed",
      timestamp: dateStr,
      txId: transactionData.txId,
      isSigned: !!agr.proofs,
      colorClass: agr.proofs ? "colorGreen" : "colorPurple",
    }),
  );

  return (
    <>
      <AgreementHeader
        breadcrumbs={breadcrumbsData}
        mainTitle={mainTitle}
        subTitle={`TxID: ${txId}`}
        createdDate={`Mined at: ${dateStr}`}
        onGenerateReport={handleGenerateReport}
      />

      <AgreementDetailsContainer
        members={members}
        proposerOffer={blockchainInfo}
        responderOffer={blockchainInfo}
      />

      <NegotiationTimeline events={timelineEvents} />
    </>
  );
};

function App() {
  const handleAgreementSearch = (walletAddress: string) => {
    console.log("Searching for agreements by wallet:", walletAddress);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <LandingScreen />
                <HowDaiaWorks />
                <SearchForYourAgreementView />
                <WhyChooseDAIAView />
                <ReadyToExploreDaia />
              </>
            }
          />

          <Route
            path="/list_of_agreements"
            element={
              <>
                <AgreementListView onSearch={handleAgreementSearch} />
              </>
            }
          />

          <Route
            path="/developers"
            element={
              <>
                <SdkScreen />
                <SDKIntegrationSteps />
                <SdkFeatures />
              </>
            }
          />

          <Route
            path="/negotiate_timeline/:txId"
            element={<AgreementDetailsPage />}
          />

          <Route
            path="/oops"
            element={
              <>
                <AgreementsListSearchBar onSearch={handleAgreementSearch} />
                <NoAgreementsFound />
              </>
            }
          />
        </Routes>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
