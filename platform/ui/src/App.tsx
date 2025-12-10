import React, { useEffect, useState, useRef } from "react";
import "./App.css";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import AgreementHeader from "./components/AgreementHeader/AgreementHeader";
import AgreementDetailsContainer from "./components/AgreementDetailsContainer/AgreementDetailsContainer";
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
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useLocation,
} from "react-router-dom";
import translations from "./translations/en-us.json";
import CheckDocumentationView from "./views/CheckDocumentationView";

const API_BASE_URL = "http://localhost:3000";
const T = translations.details_view;

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
  offerContentSerialized?: string;
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
  const { txId, walletAddress } = useParams();

  const effectiveWalletAddress = walletAddress;

  const contentRef = useRef<HTMLDivElement>(null);
  const [transactionData, setTransactionData] = useState<ApiTransaction | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!txId || !effectiveWalletAddress) {
        setLoading(false);
        setError(T.err_missing_params);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = `${API_BASE_URL}/agreements/${effectiveWalletAddress}?limit=50`;

        console.log(
          `Fetching agreements from URL: ${apiUrl} to find TxID: ${txId}`
        );

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch agreements (Status: ${response.status})`
          );
        }

        const data: ApiResponse = await response.json();
        const foundTx = data.transactions.find((tx) => tx.txId === txId);

        if (foundTx) {
          setTransactionData(foundTx);
        } else {
          setError(T.err_tx_not_found);
        }
      } catch (err: any) {
        console.error(err);
        setError(T.err_failed_load);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [txId, effectiveWalletAddress]);

  const handleGenerateReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">
          {T.msg_loading}
        </div>
      </div>
    );
  }

  if (error || !transactionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold text-red-500">
          {T.msg_error} {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {T.btn_try_again}
        </button>
      </div>
    );
  }

  const agreements = transactionData.agreements;
  const lastAgreement = agreements[agreements.length - 1];
  const signedAgreement = agreements.find((a) => a.proofs);

  let offerContent = T.msg_content_unavailable;
  let requirementsData = {};

  if ((lastAgreement as any).offerContentSerialized) {
    try {
      const parsed = JSON.parse((lastAgreement as any).offerContentSerialized);
      offerContent = parsed.naturalLanguageOfferContent || offerContent;
      requirementsData = parsed.requirements || {};
    } catch (err) {
      console.error("Error parsing offerContentSerialized:", err);
    }
  } else {
    offerContent =
      lastAgreement.offerContent?.naturalLanguageOfferContent || offerContent;
    requirementsData = lastAgreement.offerContent?.requirements || {};
  }

  const proofsData = signedAgreement?.proofs || null;
  const mainTitle = `${T.title_tx_id} ${txId}`;
  const subTitle = "";

  const dateStr = new Date(transactionData.timestamp * 1000).toLocaleString(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  const breadcrumbsData = [
    { label: "Agreements search", path: "/list_of_agreements" },
    { label: `Transaction ${txId?.substring(0, 6)}...`, path: "#" },
  ];

  return (
    <div ref={contentRef}>
      <AgreementHeader
        breadcrumbs={breadcrumbsData}
        mainTitle={mainTitle}
        subTitle={subTitle}
        createdDate={`${T.label_published_at}${dateStr}`}
        onGenerateReport={handleGenerateReport}
      />

      <div
        className="agreement-description-wrapper"
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          marginBottom: "30px",
        }}
      >
        <p
          style={{
            fontSize: "1.2rem",
            fontWeight: 600,
            color: "#333",
            marginBottom: "5px",
          }}
        >
          {T.label_description}
        </p>
        <p
          style={{
            fontSize: "1rem",
            color: "#555",
            marginBottom: "20px",
          }}
        >
          {offerContent}
        </p>
      </div>

      <AgreementDetailsContainer
        requirements={requirementsData}
        proofs={proofsData}
        naturalLanguageOfferContent={offerContent}
      />
    </div>
  );
};

const AppRoutes = () => {
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
    <div
      className="bg-gray-50"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />
      <div style={{ flexGrow: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <LandingScreen />
                <div id="how-daia-works">
                  <HowDaiaWorks />
                </div>
                <SearchForYourAgreementView />
                <WhyChooseDAIAView />
                <ReadyToExploreDaia />
              </>
            }
          />

          <Route
            path="/list_of_agreements/:query?"
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
                <div id="quick-integration">
                  <SDKIntegrationSteps />
                </div>
                <div id="sdk-features">
                  <SdkFeatures />
                </div>
                <CheckDocumentationView />
              </>
            }
          />

          <Route
            path="/agreement_details/:txId/:walletAddress?"
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
      </div>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
