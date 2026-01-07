import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "./AgreementListView.module.scss";
import AgreementListItem from "../components/AgreementsListItem/AgreementsListItem";
import AgreementsListSearchBar from "../components/AgreementsListSearchBar/AgreementsListSearchBar";
import NoAgreementsFound from "../components/NoAgreementsFound/NoAgreementsFound";

interface AgreementsListViewProps {
	onSearch: (walletAddress: string) => void;
}

interface Agreement {
	id: string;
	txId: string;
	title: string;
	date: string;
	status: "Published" | "Failed" | "Verifying";
}

interface ApiOfferContent {
	naturalLanguageOfferContent: string;
}

interface ApiAgreementItem {
	offerContent: ApiOfferContent;
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
	hasMore?: boolean;
}

const ITEMS_PER_PAGE = 8;
const API_BASE_URL = "/api";

const AgreementsListView: React.FC<AgreementsListViewProps> = ({ onSearch }) => {
	const { t, i18n } = useTranslation();

	const navigate = useNavigate();
	const { query } = useParams<{ query: string }>();

	const [walletAddress, setWalletAddress] = useState(query || "");
	const [agreements, setAgreements] = useState<Agreement[]>([]);

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validationError, setValidationError] = useState<string | null>(null);

	const [hasSearched, setHasSearched] = useState(!!query);

	const [currentPage, setCurrentPage] = useState(1);
	const [maxDiscoveredPage, setMaxDiscoveredPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	const fetchAgreementsFromApi = useCallback(
		async (address: string, page: number = 1) => {
			setIsLoading(true);
			setError(null);
			setValidationError(null);

			try {
				const offset = (page - 1) * ITEMS_PER_PAGE;

				const params = new URLSearchParams({
					limit: ITEMS_PER_PAGE.toString(),
					offset: offset.toString(),
				});

				const fullUrl = `${API_BASE_URL}/agreements/address/${address}?${params.toString()}`;

				const response = await fetch(fullUrl);

				if (!response.ok) {
					throw new Error(t("search_view.msg_api_error"));
				}

				const data: ApiResponse = await response.json();

				const mappedAgreements: Agreement[] = data.transactions.flatMap((tx) => {
					const currentTxId = (tx as any).TxId || tx.txId;
					const isConfirmed = (tx as any).confirmed !== false;

					if (tx.agreements && Array.isArray(tx.agreements)) {
						return tx.agreements.map((agr, index) => ({
							id: `${currentTxId}-${agr.vout || index}`,
							txId: currentTxId,
							title: agr.offerContent.naturalLanguageOfferContent,
							date: isConfirmed
								? new Date(tx.timestamp * 1000).toLocaleDateString(i18n.language, {
										year: "numeric",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})
								: "N/A",
							status: isConfirmed ? "Published" : "Verifying",
						}));
					}

					if ((tx as any).agreement) {
						const agreement = (tx as any).agreement;
						const titleText =
							agreement.offerContent?.naturalLanguageOfferContent ||
							agreement.naturalLanguageOfferContent ||
							"Agreement";

						return [
							{
								id: currentTxId,
								txId: currentTxId,
								title: titleText,
								date: isConfirmed
									? new Date(tx.timestamp * 1000).toLocaleDateString(i18n.language, {
											year: "numeric",
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})
									: "N/A",
								status: isConfirmed ? "Published" : "Verifying",
							},
						];
					}

					return [];
				});

				setAgreements(mappedAgreements);

				const backendHasMore = data.hasMore ?? mappedAgreements.length === ITEMS_PER_PAGE;

				setMaxDiscoveredPage((prev) => Math.max(prev, page));
				setHasNextPage(backendHasMore);
			} catch (err) {
				console.error(err);
				setError(t("search_view.msg_api_error"));
				setAgreements([]);
				setHasNextPage(false);
			} finally {
				setIsLoading(false);
			}
		},
		[t, i18n],
	);

	const handleSearchAction = useCallback(
		(address: string, isManualSearch: boolean = true) => {
			const trimmedAddress = address.trim();
			if (!trimmedAddress) return;

			if (isManualSearch) {
				navigate(`/list_of_agreements/${trimmedAddress}`);
			}

			setCurrentPage(1);
			setMaxDiscoveredPage(1);
			setHasNextPage(false);

			setWalletAddress(trimmedAddress);
			setHasSearched(true);
			onSearch(trimmedAddress);

			fetchAgreementsFromApi(trimmedAddress, 1);
		},
		[navigate, onSearch, fetchAgreementsFromApi],
	);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 640);
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (query) {
			setValidationError(null);
			handleSearchAction(query, false);
		}
	}, [query, handleSearchAction]);

	const handlePageChange = (page: number) => {
		if (page < 1 || isLoading) return;
		if (page > maxDiscoveredPage + 1) return;
		if (page === maxDiscoveredPage + 1 && !hasNextPage) return;

		setCurrentPage(page);

		fetchAgreementsFromApi(walletAddress, page);

		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const getPaginationRange = () => {
		const range: (number | string)[] = [];

		if (currentPage > 2) {
			range.push(1);
			if (currentPage > 3) {
				range.push("...");
			}
		}

		if (currentPage > 1) {
			range.push(currentPage - 1);
		}

		range.push(currentPage);

		if (currentPage < maxDiscoveredPage) {
			range.push(currentPage + 1);
		} else if (hasNextPage) {
			range.push(currentPage + 1);
		}

		return range;
	};

	const Pagination = () => {
		const pageRange = getPaginationRange();

		if (pageRange.length <= 1) return null;

		if (isMobile) {
			return (
				<div className={styles.paginationWrapper}>
					<button
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1 || isLoading}
						className={styles.paginationArrow}
					>
						&lt;
					</button>
					<span className={styles.currentPageMobile}>
						{currentPage}{" "}
						{hasNextPage || currentPage < maxDiscoveredPage ? `/ ${maxDiscoveredPage}+` : ""}
					</span>
					<button
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={(currentPage === maxDiscoveredPage && !hasNextPage) || isLoading}
						className={styles.paginationArrow}
					>
						&gt;
					</button>
				</div>
			);
		}

		return (
			<div className={styles.paginationWrapper}>
				<button
					onClick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1 || isLoading}
					className={styles.paginationArrow}
				>
					&lt;
				</button>
				{pageRange.map((page, index) =>
					page === "..." ? (
						<span key={`dots-${index}`} className={styles.paginationDots}>
							...
						</span>
					) : (
						<button
							key={page}
							onClick={() => handlePageChange(page as number)}
							disabled={isLoading}
							className={`${styles.pageButton} ${page === currentPage ? styles.pageButtonActive : ""}`}
						>
							{page}
						</button>
					),
				)}
				<button
					onClick={() => handlePageChange(currentPage + 1)}
					disabled={(currentPage === maxDiscoveredPage && !hasNextPage) || isLoading}
					className={styles.paginationArrow}
				>
					&gt;
				</button>
			</div>
		);
	};

	const handleItemClick = (txId: string) => {
		navigate(`/agreement_details/${txId}`, {
			state: { walletAddress },
		});
	};

	const renderHeader = () => {
		return (
			<div className={styles.searchBarHeader}>
				<h1 className="title">{t("agreement_list.title")}</h1>
				<p className="subtitle">{t("agreement_list.subtitle")}</p>

				<AgreementsListSearchBar
					onSearch={handleSearchAction}
					initialValue={walletAddress}
					onErrorChange={setValidationError}
				/>
			</div>
		);
	};

	const renderContent = () => {
		if (isLoading && currentPage === 1) {
			return (
				<div style={{ textAlign: "center", padding: "20px" }}>{t("search_view.msg_loading")}</div>
			);
		}

		if (error) {
			return <div style={{ textAlign: "center", color: "red", padding: "20px" }}>{error}</div>;
		}

		if (validationError) {
			return (
				<div
					style={{
						textAlign: "center",
						color: "red",
						padding: "40px",
						fontWeight: "600",
					}}
				>
					{validationError}
				</div>
			);
		}

		if (hasSearched && agreements.length === 0 && currentPage === 1) {
			return <NoAgreementsFound />;
		}

		if (!hasSearched) {
			return (
				<div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
					{t("search_view.msg_default_prompt")}
				</div>
			);
		}

		if (agreements.length > 0) {
			return (
				<>
					<div className={styles.agreementsList}>
						{agreements.map((item) => (
							<AgreementListItem
								key={item.id}
								title={item.title}
								date={item.date}
								status={item.status}
								txId={item.txId}
								onClick={() => handleItemClick(item.txId)}
							/>
						))}
					</div>
					<Pagination />
				</>
			);
		}

		return null;
	};

	return (
		<main className={styles.agreementsPageContainer}>
			<div className={styles.contentWrapper}>
				{renderHeader()}

				<div className={styles.agreementsListContainer}>{renderContent()}</div>
			</div>
		</main>
	);
};

export default AgreementsListView;
