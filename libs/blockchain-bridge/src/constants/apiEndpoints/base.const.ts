type Network = "main" | "test";

export const GET_BASE_URL = (network: Network = "main"): string => {
  return `https://api.whatsonchain.com/v1/bsv/${network}`;
};
