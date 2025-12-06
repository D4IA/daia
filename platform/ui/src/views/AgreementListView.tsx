import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AgreementListView.module.scss";
import AgreementListItem from "../components/AgreementsListItem/AgreementsListItem";
import AgreementsListSearchBar from "../components/AgreementsListSearchBar/AgreementsListSearchBar";
import translations from "../translations/en-us.json";
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
const T = translations.search_view;
const API_BASE_URL = "http://localhost:3000";

const AgreementsListView: React.FC<AgreementsListViewProps> = ({
  onSearch,
}) => {
  const navigate = useNavigate();

  const [walletAddress, setWalletAddress] = useState("");
  const [agreements, setAgreements] = useState<Agreement[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const filteredAgreements = agreements;

  const totalPages = Math.ceil(filteredAgreements.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAgreements = filteredAgreements.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchAgreementsFromApi = async (address: string) => {
    setIsLoading(true);
    setError(null);
    setAgreements([]);

    try {
      const response = await fetch(`${API_BASE_URL}/agreements/${address}`);

      if (!response.ok) {
        throw new Error("Błąd podczas pobierania danych");
      }

      const data: ApiResponse = await response.json();

      const mappedAgreements: Agreement[] = data.transactions.flatMap((tx) =>
        tx.agreements.map((agr, index) => ({
          id: `${tx.txId}-${agr.vout || index}`,
          txId: tx.txId,
          title: agr.offerContent.naturalLanguageOfferContent,
          date: new Date(tx.timestamp * 1000).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "Published",
        })),
      );

      setAgreements(mappedAgreements);
    } catch (err) {
      console.error(err);
      setError(
        "Nie udało się pobrać umów. Sprawdź adres portfela lub połączenie.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleSearchAction = (address: string) => {
    if (!address.trim()) return;

    setWalletAddress(address);
    setHasSearched(true);
    setCurrentPage(1);
    onSearch(address);

    fetchAgreementsFromApi(address);
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
          ),
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
    console.log(`Navigating to agreement details for TxID: ${txId}`);
    navigate(`/negotiate_timeline/${txId}`);
  };

  const renderAgreementsList = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          Loading transactions...
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

    if (hasSearched && agreements.length === 0) {
      return <NoAgreementsFound />;
    }

    if (!hasSearched) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          Enter a wallet address above to see agreements.
        </div>
      );
    }

    return (
      <>
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
  };

  return (
    <main className={styles.agreementsPageContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.searchBarHeader}>
          <h1 className="title">{T.title}</h1>
          <p className="subtitle">{T.subtitle}</p>

          <AgreementsListSearchBar onSearch={handleSearchAction} />
        </div>

        <div className={styles.agreementsListContainer}>
          {renderAgreementsList()}
        </div>
      </div>
    </main>
  );
};

export default AgreementsListView;
