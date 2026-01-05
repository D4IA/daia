import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "./AgreementListView.module.scss";
import AgreementListItem from "../components/AgreementsListItem/AgreementsListItem";
import AgreementsListSearchBar from "../components/AgreementsListSearchBar/AgreementsListSearchBar";
import AgreementFilters from "../components/AgreementFilters/AgreementFilters";
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
}

const ITEMS_PER_PAGE = 8;
const API_BASE_URL = "/api";

const AgreementsListView: React.FC<AgreementsListViewProps> = ({
  onSearch,
}) => {
  const { t, i18n } = useTranslation();

  const navigate = useNavigate();
  const { query } = useParams<{ query: string }>();

  const [walletAddress, setWalletAddress] = useState(query || "");
  const [agreements, setAgreements] = useState<Agreement[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [txIdFilter, setTxIdFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [hasSearched, setHasSearched] = useState(!!query);

  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const fetchAgreementsFromApi = useCallback(
    async (address: string) => {
      setIsLoading(true);
      setError(null);
      setAgreements([]);
      setValidationError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/agreements/address/${address}`
        );

        if (!response.ok) {
          throw new Error(t("search_view.msg_api_error"));
        }

        const data: ApiResponse = await response.json();

        const mappedAgreements: Agreement[] = data.transactions.flatMap(
          (tx) => {
            const currentTxId = (tx as any).TxId || tx.txId;

            if (tx.agreements && Array.isArray(tx.agreements)) {
              return tx.agreements.map((agr, index) => ({
                id: `${currentTxId}-${agr.vout || index}`,
                txId: currentTxId,
                title: agr.offerContent.naturalLanguageOfferContent,
                date: new Date(tx.timestamp * 1000).toLocaleDateString(
                  i18n.language,
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ),
                status: "Published",
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
                  date: new Date(tx.timestamp * 1000).toLocaleDateString(
                    i18n.language,
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ),
                  status: "Published",
                },
              ];
            }

            return [];
          }
        );

        setAgreements(mappedAgreements);
      } catch (err) {
        console.error(err);
        setError(t("search_view.msg_api_error"));
      } finally {
        setIsLoading(false);
      }
    },
    [t, i18n]
  );

  const handleSearchAction = useCallback(
    (address: string, isManualSearch: boolean = true) => {
      const trimmedAddress = address.trim();
      if (!trimmedAddress) return;

      if (isManualSearch) {
        navigate(`/list_of_agreements/${trimmedAddress}`);
      }

      setTxIdFilter("");
      setDateFilter("");

      setWalletAddress(trimmedAddress);
      setHasSearched(true);
      setCurrentPage(1);
      onSearch(trimmedAddress);

      fetchAgreementsFromApi(trimmedAddress);
    },
    [navigate, onSearch, fetchAgreementsFromApi]
  );

  const filteredAgreements = agreements.filter((item) => {
    const matchesTxId = txIdFilter
      ? item.txId.toLowerCase().includes(txIdFilter.toLowerCase())
      : true;

    let matchesDate = true;
    if (dateFilter) {
      try {
        const itemDate = new Date(item.date);
        const yyyy = itemDate.getFullYear();
        const mm = String(itemDate.getMonth() + 1).padStart(2, "0");
        const dd = String(itemDate.getDate()).padStart(2, "0");
        const formattedItemDate = `${yyyy}-${mm}-${dd}`;

        matchesDate = formattedItemDate === dateFilter;
      } catch (e) {
        matchesDate = false;
      }
    }

    return matchesTxId && matchesDate;
  });

  const totalPages = Math.ceil(filteredAgreements.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAgreements = filteredAgreements.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
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

  useEffect(() => {
    setCurrentPage(1);
  }, [txIdFilter, dateFilter]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPaginationRange = () => {
    const delta = 2;
    const range: (number | string)[] = [];
    const pagesToShow = new Set<number>();

    pagesToShow.add(1);
    pagesToShow.add(totalPages);

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i >= 1 && i <= totalPages) {
        pagesToShow.add(i);
      }
    }

    const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      range.push(page);
      if (i < sortedPages.length - 1 && sortedPages[i + 1] > page + 1) {
        range.push("...");
      }
    }
    return range;
  };

  const Pagination = () => {
    if (totalPages <= 1 || currentAgreements.length === 0) return null;
    const pageRange = getPaginationRange();

    if (isMobile) {
      return (
        <div className={styles.paginationWrapper}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={styles.paginationArrow}
          >
            &lt;
          </button>
          <span className={styles.currentPageMobile}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
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
          disabled={currentPage === 1}
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
              className={`${styles.pageButton} ${
                page === currentPage ? styles.pageButtonActive : ""
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
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
    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          {t("search_view.msg_loading")}
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", color: "red", padding: "20px" }}>
          {error}
        </div>
      );
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

    if (hasSearched && agreements.length === 0) {
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
      const filterBar = (
        <AgreementFilters
          txIdFilter={txIdFilter}
          dateFilter={dateFilter}
          onTxIdChange={setTxIdFilter}
          onDateChange={setDateFilter}
        />
      );

      if (filteredAgreements.length === 0 && (txIdFilter || dateFilter)) {
        return (
          <>
            {filterBar}
            <div
              style={{ textAlign: "center", padding: "40px", color: "#666" }}
            >
              {t("search_view.msg_no_filter_match")}
            </div>
          </>
        );
      }

      return (
        <>
          {filterBar}

          <div className={styles.agreementsList}>
            {currentAgreements.map((item) => (
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
