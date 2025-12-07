import React from "react";
import styles from "./AgreementFilters.module.scss";

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
  return (
    <div className={styles.filterBarWrapper}>
      <input
        type="text"
        placeholder="Filter by Transaction ID (TxID)"
        value={txIdFilter}
        onChange={(e) => onTxIdChange(e.target.value)}
        className={styles.filterInput}
      />
      <input
        type="date"
        placeholder="Filter by Date"
        value={dateFilter}
        onChange={(e) => onDateChange(e.target.value)}
        className={styles.filterInput}
      />
    </div>
  );
};

export default AgreementFilters;
