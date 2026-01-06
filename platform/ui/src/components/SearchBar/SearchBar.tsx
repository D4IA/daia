import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./SearchBar.module.scss";
import SearchIconUrl from "../../assets/search.svg";

interface WalletAddressInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	onSearch?: (value: string) => void;
}

const WalletAddressInput: React.FC<WalletAddressInputProps> = ({
	value,
	onChange,
	placeholder,
	onSearch,
}) => {
	const { t } = useTranslation();

	const effectivePlaceholder = placeholder || t("search_view.placeholder");
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
				placeholder={effectivePlaceholder}
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
