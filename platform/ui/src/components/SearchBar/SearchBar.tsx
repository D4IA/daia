import React, { useState } from "react";
import styles from "./SearchBar.module.scss";
import SearchIconUrl from "../../assets/search.svg";
import translations from "../../translations/en-us.json";

interface WalletAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: (value: string) => void;
}

const T = translations.search_view;

const WalletAddressInput: React.FC<WalletAddressInputProps> = ({
  value,
  onChange,
  placeholder = T.placeholder,
  onSearch,
}) => {
  const handleSearchClick = () => {
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={styles.inputContainer}>
      <input
        type="text"
        className={styles.inputField}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") handleSearchClick();
        }}
      />

      <img
        src={SearchIconUrl}
        alt="Search Icon"
        className={styles.searchIcon}
        onClick={handleSearchClick}
      />
    </div>
  );
};

export default WalletAddressInput;
