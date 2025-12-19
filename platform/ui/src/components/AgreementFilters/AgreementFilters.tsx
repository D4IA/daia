import React from "react";
import styles from "./AgreementFilters.module.scss";
import { useTranslation } from "react-i18next";

interface AgreementFiltersProps {
  txIdFilter: string;
  dateFilter: string;
  onTxIdChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

const AgreementFilters: React.FC<AgreementFiltersProps> = ({
  txIdFilter,
  dateFilter,
  onTxIdChange,
  onDateChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.filterBarWrapper}>
      <input
        type="text"
        placeholder={t("agreement_list.filter_txid_placeholder")}
        value={txIdFilter}
        onChange={(e) => onTxIdChange(e.target.value)}
        className={styles.filterInput}
      />
      <input
        type="date"
        placeholder={t("agreement_list.filter_date_placeholder")}
        value={dateFilter}
        onChange={(e) => onDateChange(e.target.value)}
        className={styles.filterInput}
      />
    </div>
  );
};

export default AgreementFilters;
