import { throttleFetchJsonOrNull } from "#src/adapters/httpAdapter";
import { GET_ADDRESS_BALANCE, GET_ADDRESS_UNSPENT_TRANSACTIONS } from "#src/constants/apiEndpoints/index";
import type { Utxo } from "#types/wallet";

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

/**
 * Fetches the **unspent transaction outputs (UTXOs)** for a given BSV address.
 *
 * @param address - The wallet address to fetch UTXOs for.
 * @returns An array of UTXO objects.
 */
export const fetchAddressUtxos = async (address: string) => {
  return await throttleFetchJsonOrNull<Utxo[]>(
    GET_ADDRESS_UNSPENT_TRANSACTIONS(address)
  );
};
