import type { Utxo } from "#types/wallet";

/**
 * Selects UTXOs to cover the required amount using a simple accumulation strategy.
 * 
 * @param utxos - Array of available UTXOs
 * @param amountRequired - Amount in satoshis needed (including fees)
 * @returns Selected UTXOs or null if insufficient funds
 */
export const selectUtxosWithRequiredAmount = (utxos: Utxo[], amountRequired: number): Utxo[] | null => {
  if (!utxos || utxos.length === 0) {
    return null;
  }

  // Sort UTXOs by value (largest first) for efficient selection
  const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

  const selectedUtxos: Utxo[] = [];
  let totalValue = 0;

  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    totalValue += utxo.value;

    if (totalValue >= amountRequired) {
      return selectedUtxos;
    }
  }

  // Insufficient funds
  return null;
};
