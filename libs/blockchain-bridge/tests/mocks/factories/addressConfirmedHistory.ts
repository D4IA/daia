import type { WalletConfirmedHistoryTransactions } from "#types/wallet.d.ts";

export const TEST_ADDRESS = "TEST_ADDRESS";

export const createTxConfirmedHistoryPage = (
  counter: number,
  options: { shouldHaveNextPage?: boolean; tx_amount?: number } = {
    shouldHaveNextPage: true,
    tx_amount: 1,
  }
): WalletConfirmedHistoryTransactions => {
  const { shouldHaveNextPage, tx_amount } = options;
  const normalizedTxAmount = tx_amount ?? 1;

  const txs = Array.from({ length: normalizedTxAmount }, (_, i) => ({
    tx_hash: (counter + i).toString(),
    height: counter + i,
  }));
  return {
    address: TEST_ADDRESS,
    script: "SCRIPT",
    result: txs,
    nextPageToken: shouldHaveNextPage ? (counter + 1).toString() : undefined,
    error: "",
  };
};
