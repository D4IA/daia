import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { generateAgreementPDF } from "../services/pdfGenerator";
import { useTranslation } from "react-i18next";
import AgreementHeader from "../components/AgreementHeader/AgreementHeader";
import AgreementDetailsContainer from "../components/AgreementDetailsContainer/AgreementDetailsContainer";

const API_BASE_URL = "/api";

const AgreementDetailsPage: React.FC = () => {
	const { t, i18n } = useTranslation();
	const { txId } = useParams();
	const location = useLocation();

	const walletAddress = (location.state as any)?.walletAddress || null;

	const [offerContent, setOfferContent] = useState("");
	const [requirementsArray, setRequirementsArray] = useState<any[]>([]);
	const [proofsArray, setProofsArray] = useState<any[]>([]);
	const [timestamp, setTimestamp] = useState<number>(0);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchTransactionDetails = async () => {
			if (!txId) return;
			setLoading(true);
			setError(null);

			try {
				const response = await fetch(`${API_BASE_URL}/agreements/tx/${txId}`);
				if (!response.ok) throw new Error(t("details_view.err_tx_not_found"));

				const data = await response.json();

				const agreementObj =
					data.agreement || (data.agreements ? data.agreements[0]?.agreement : null) || {};

				let content = agreementObj.naturalLanguageOfferContent || "";

				if (!content && agreementObj.offerContentSerialized) {
					try {
						const parsed = JSON.parse(agreementObj.offerContentSerialized);
						content = parsed.naturalLanguageOfferContent || "";
					} catch (e) {
						console.error("Serialized content parse error", e);
					}
				}
				setOfferContent(content || t("details_view.msg_content_unavailable"));

				const rawReqs = agreementObj.requirements || {};
				const allRequirements = Object.entries(rawReqs).map(([uuid, req]) => ({
					uuid,
					...(req as object),
				}));
				setRequirementsArray(allRequirements);

				const rawProofs = agreementObj.proofs || {};
				const allProofs = Object.entries(rawProofs).map(([uuid, proof]) => ({
					uuid,
					...(proof as object),
				}));
				setProofsArray(allProofs);

				setTimestamp(data.timestamp || 0);
			} catch (err: any) {
				console.error("Fetch error:", err);
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchTransactionDetails();
	}, [txId, t]);

	const dateStr = timestamp
		? new Date(timestamp * 1000).toLocaleString(i18n.language, {
				dateStyle: "medium",
				timeStyle: "short",
			})
		: "";

	if (loading)
		return (
			<div className="min-h-screen flex items-center justify-center">
				{t("details_view.msg_loading")}
			</div>
		);
	if (error)
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4">
				<div className="text-red-500">
					{t("details_view.msg_error")} {error}
				</div>
				<button
					onClick={() => window.location.reload()}
					className="px-4 py-2 bg-blue-600 text-white rounded"
				>
					{t("details_view.btn_try_again")}
				</button>
			</div>
		);

	const breadcrumbPath = walletAddress
		? `/list_of_agreements/${walletAddress}`
		: "/list_of_agreements";

	return (
		<div>
			<AgreementHeader
				breadcrumbs={[
					{ label: t("agreement_list.title"), path: breadcrumbPath },
					{ label: `ID: ${txId?.substring(0, 6)}...`, path: "#" },
				]}
				mainTitle={`${t("details_view.title_tx_id")} ${txId}`}
				subTitle=""
				createdDate={`${t("details_view.label_published_at")} ${dateStr}`}
				onGenerateReport={() =>
					generateAgreementPDF({
						txId: txId || "",
						description: offerContent,
						publishedDate: dateStr,
						requirements: requirementsArray,
						proofs: proofsArray,
					})
				}
			/>

			<div
				style={{
					maxWidth: "1000px",
					margin: "0 auto",
					padding: "0 16px",
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
				<p
					style={{
						fontSize: "1rem",
						color: "#555",
						marginBottom: "20px",
						whiteSpace: "pre-wrap",
					}}
				>
					{offerContent}
				</p>
			</div>

			<AgreementDetailsContainer requirementsArray={requirementsArray} proofsArray={proofsArray} />
		</div>
	);
};

export default AgreementDetailsPage;
