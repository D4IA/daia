type Network = "main" | "test";

const GET_BASE_URL = (network: Network = "test"): string => {
  return `https://api.whatsonchain.com/v1/bsv/${network}`;
};

export const GET_TRANSACTION_BY_TX_ID = (transactionId: string): string => {
  return `${GET_BASE_URL()}/tx/${transactionId}`;
};

export const GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS = (
  address: string,
  params?: {
    pageToken?: string;
  }
): string => {
  const urlParams = new URLSearchParams();
  if (params?.pageToken) {
    urlParams.append("pageToken", params.pageToken);
  }
  const stringifiedParams = urlParams.toString();
  if (stringifiedParams.length > 0) {
    return `${GET_BASE_URL()}/address/${address}/confirmed/history?${stringifiedParams}`;
  }
  return `${GET_BASE_URL()}/address/${address}/confirmed/history`;
};

export const GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS = (): string => {
  return `${GET_BASE_URL()}/txs`;
};
