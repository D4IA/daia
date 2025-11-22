import { throttleFetchJsonOrNull } from "#src/adapters/httpAdapter";
import { GET_ADDRESS_BALANCE } from "#src/constants/apiEndpoints/index";

export type AddressBalance = {
  address: string;
  script: string;
  confirmed: number;
  error: string;
  associatedScripts: Array<{
    script: string;
    type: string;
  }>;
};

export const fetchAddressBalance = async (address: string) => {
  return await throttleFetchJsonOrNull<AddressBalance>(
    GET_ADDRESS_BALANCE(address)
  );
};
