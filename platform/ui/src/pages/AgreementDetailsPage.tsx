import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { generateAgreementPDF } from "../services/pdfGenerator";
import { useTranslation } from "react-i18next";
import AgreementHeader from "../components/AgreementHeader/AgreementHeader";
import AgreementDetailsContainer from "../components/AgreementDetailsContainer/AgreementDetailsContainer";

const API_BASE_URL = "http://localhost:3000";

interface ApiTransaction {
  txId: string;
  timestamp: number;
  agreements: any[];
}

const AgreementDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { txId } = useParams();
  const [transactionData, setTransactionData] = useState<ApiTransaction | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!txId) {
        setLoading(false);
        setError(t("details_view.err_missing_params"));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = `${API_BASE_URL}/agreements/tx/${txId}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(t("details_view.err_tx_not_found"));
          }
          throw new Error(
            `Failed to fetch transaction (Status: ${response.status})`
          );
        }

        const data: ApiTransaction = await response.json();

        if (data && data.txId === txId) {
          setTransactionData(data);
        } else {
          setError(t("details_view.err_tx_not_found"));
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || t("details_view.err_failed_load"));
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [txId, t]);

  const handleGenerateReport = () => {
    if (!transactionData) return;

    const pdfData = {
      txId: transactionData.txId,
      description: offerContent,
      publishedDate: dateStr,
      requirements: {
        type: (requirementsData as any)?.req_signature?.type || "N/A",
        pubKey: (requirementsData as any)?.req_signature?.pubKey || "N/A",
        offererNonce:
          (requirementsData as any)?.req_signature?.offererNonce || "N/A",
      },
      proofs: proofsData
        ? {
            type: proofsData.req_signature?.type || proofsData.type || "N/A",
            signeeNonce: proofsData.req_signature?.signeeNonce || "N/A",
            signature:
              proofsData.req_signature?.signature ||
              proofsData.signature ||
              "N/A",
          }
        : null,
    };

    generateAgreementPDF(pdfData, t, i18n.language);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">
          {t("details_view.msg_loading")}
        </div>
      </div>
    );
  }

  if (error || !transactionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl font-semibold text-red-500">
          {t("details_view.msg_error")} {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {t("details_view.btn_try_again")}
        </button>
      </div>
    );
  }

  const agreements = transactionData.agreements;
  const lastAgreement = agreements[agreements.length - 1];
  const signedAgreement = agreements.find((a) => a.proofs);

  let offerContent = t("details_view.msg_content_unavailable");
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
  const mainTitle = `${t("details_view.title_tx_id")} ${txId}`;
  const dateStr = new Date(transactionData.timestamp * 1000).toLocaleString(
    i18n.language,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  const breadcrumbsData = [
    { label: t("agreement_list.title"), path: "/list_of_agreements" },
    {
      label: `${t("details_view.title_tx_id")} ${txId?.substring(0, 6)}...`,
      path: "#",
    },
  ];

  return (
    <div>
      <AgreementHeader
        breadcrumbs={breadcrumbsData}
        mainTitle={mainTitle}
        subTitle=""
        createdDate={`${t("details_view.label_published_at")}${dateStr}`}
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
          {t("details_view.label_description")}
        </p>
        <p style={{ fontSize: "1rem", color: "#555", marginBottom: "20px" }}>
          {offerContent}
        </p>
      </div>

      <AgreementDetailsContainer
        requirements={requirementsData}
        proofs={proofsData}
      />
    </div>
  );
};

export default AgreementDetailsPage;
