import { GET_BASE_URL } from "./base.const";

export const GET_TRANSACTION_BY_TX_ID = (transactionId: string): string => {
  return `${GET_BASE_URL()}/tx/${transactionId}`;
};

export const GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS = (): string => {
  return `${GET_BASE_URL()}/txs`;
};
