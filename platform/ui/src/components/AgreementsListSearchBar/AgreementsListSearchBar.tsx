import React, { useState, useEffect } from "react";
import styles from "./AgreementsListSearchBar.module.scss";
import SearchBar from "../SearchBar/SearchBar";
import Button from "../Button/Button";
import translations from "../../translations/en-us.json";

interface SearchForAgreementBarProps {
  onSearch: (walletAddress: string) => void;
  initialValue?: string;
  onErrorChange: (error: string | null) => void;
}

const T = translations.search_agreement;
const ERROR_MESSAGE = T.error_empty;

const AgreementsListSearchBar: React.FC<SearchForAgreementBarProps> = ({
  onSearch,
  initialValue = "",
  onErrorChange,
}) => {
  const [walletAddress, setWalletAddress] = useState(initialValue);

  useEffect(() => {
    setWalletAddress(initialValue);
    if (initialValue) {
      onErrorChange(null);
    }
  }, [initialValue, onErrorChange]);

  const handleInputChange = (value: string) => {
    onErrorChange(null);
    setWalletAddress(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedAddress = walletAddress.trim();

    if (!trimmedAddress) {
      onErrorChange(ERROR_MESSAGE);
      return;
    }

    onErrorChange(null);
    onSearch(trimmedAddress);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.container}>
      <div className={styles.inputBarWrapper}>
        <SearchBar
          value={walletAddress}
          onChange={handleInputChange}
          placeholder={T.placeholder}
        />

        <Button type="submit" className={`actionButton ${styles.searchButton}`}>
          {T.button}
        </Button>
      </div>
    </form>
  );
};

export default AgreementsListSearchBar;
