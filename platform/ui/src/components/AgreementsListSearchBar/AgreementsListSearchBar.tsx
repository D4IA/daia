import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "./AgreementsListSearchBar.module.scss";
import SearchBar from "../SearchBar/SearchBar";
import Button from "../Button/Button";

interface SearchForAgreementBarProps {
	onSearch: (walletAddress: string) => void;
	initialValue?: string;
	onErrorChange: (error: string | null) => void;
}

const AgreementsListSearchBar: React.FC<SearchForAgreementBarProps> = ({
	onSearch,
	initialValue = "",
	onErrorChange,
}) => {
	const { t } = useTranslation();
	const [walletAddress, setWalletAddress] = useState(initialValue);

	const ERROR_MESSAGE = t("search_agreement.error_empty");

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
					placeholder={t("search_agreement.placeholder")}
				/>

				<Button type="submit" className={`actionButton ${styles.searchButton}`}>
					{t("search_agreement.button")}
				</Button>
			</div>
		</form>
	);
};

export default AgreementsListSearchBar;
