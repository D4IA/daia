import { GET_BASE_URL } from "./base.const";

export const GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS = (
  address: string,
  params?: {
    pageToken?: string;
  }
): string => {
  const urlParams = new URLSearchParams();
  if (params?.pageToken) {
    urlParams.append("token", params.pageToken);
  }
  const stringifiedParams = urlParams.toString();
  let url = `${GET_BASE_URL()}/address/${address}/confirmed/history`;
  if (stringifiedParams.length > 0) {
    url += `?${stringifiedParams}`;
  }
  return url;
};

export const GET_ADDRESS_BALANCE = (address: string): string => {
  return `${GET_BASE_URL()}/address/${address}/confirmed/balance`;
};

export const GET_ADDRESS_UNSPENT_TRANSACTIONS = (address: string): string => {
  return `${GET_BASE_URL()}/address/${address}/unspent`;
};
