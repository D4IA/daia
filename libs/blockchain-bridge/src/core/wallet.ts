import { throttleFetchJsonOrNull } from "#src/adapters/httpAdapter";
import { GET_ADDRESS_BALANCE } from "#src/constants/apiEndpoints/index";

/**
 * Represents the balance of a BSV address.
 */
export type AddressBalance = {
  address: string;
  script: string;
  /** Confirmed balance in satoshis */
  confirmed: number;
  /** Unconfirmed balance in satoshis (if available) */
  unconfirmed?: number;
  error: string;
  associatedScripts: Array<{
    script: string;
    type: string;
  }>;
};

/**
 * Fetches the **confirmed** balance for a given BSV address.
 *
 * @param address - The wallet address to fetch balance for.
 * @returns The balance object.
 */
export const fetchAddressBalance = async (address: string) => {
  return await throttleFetchJsonOrNull<AddressBalance>(
    GET_ADDRESS_BALANCE(address)
  );
};
