import React, { useState } from "react";
import styles from "./AgreementsListSearchBar.module.scss";
import SearchBar from "../SearchBar/SearchBar";
import Button from "../Button/Button";
import translations from "../../translations/en-us.json";

interface SearchForAgreementBarProps {
  onSearch: (walletAddress: string) => void;
}

const T = translations.search_agreement;

const SearchForAgreementBar: React.FC<SearchForAgreementBarProps> = ({
  onSearch,
}) => {
  const [walletAddress, setWalletAddress] = useState("");

  const handleLocalSearch = () => {
    onSearch(walletAddress);
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputBarWrapper}>
        <SearchBar
          value={walletAddress}
          onChange={setWalletAddress}
          placeholder={T.placeholder}
        />

        <Button
          onClick={handleLocalSearch}
          className={`actionButton ${styles.searchButton}`}
        >
          {T.button}
        </Button>
      </div>
    </div>
  );
};

export default SearchForAgreementBar;
