import { getBridgeConfig } from "#src/config";

export const GET_BASE_URL = (network = getBridgeConfig().network): string => {
  return `https://api.whatsonchain.com/v1/bsv/${network}`;
};
