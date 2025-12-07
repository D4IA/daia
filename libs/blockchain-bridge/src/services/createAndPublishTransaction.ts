import { fetchAddressUtxos } from "#src/api/wallet";
import { broadcastTransaction, fetchBulkRawTransactionData} from "#src/api/transactions"
import {selectUtxosWithRequiredAmount} from "#src/core/utxo"
import { PrivateKey, Transaction, P2PKH, SatoshisPerKilobyte } from "@bsv/sdk";
import type { Utxo } from "#types/wallet";
import { createOpReturnLockingScript } from "#src/core/opReturnTemplate";
import { chunkArrayAndPerformActionOnChunk } from "#src/utils/chunkArray";
import { getBridgeConfig } from "#src/config";
import { TRANSACTIONS_PER_BATCH } from "#src/constants/transactions";

/**
 * @param privateKey - private key in WIF format for signing the transaction
 * @param content - optional content to be added to the transaction
 * @param toAddress - address to which the transaction will be sent
 * @param amount - optional amount of satoshis to be sent in case of a transfer
 */
type CreateAndPublishTransactionParams = {
  privateKey: string;
  toAddress: string;
  content?: string;
  amount?: number;
}

const NET_PREFIXES = {
    "main": [0x00],
    "test": [0x6f]
}

/**
 * Creates and publishes a transaction.
 * @see {@link CreateAndPublishTransactionParams}
 */
export const createAndPublishTransaction = async (params: CreateAndPublishTransactionParams) => {
    if(!params.privateKey){
        throw new Error("Private key is required");
    }
    const privateKeyInstance = PrivateKey.fromWif(params.privateKey);
    const senderAddress = privateKeyInstance.toAddress(NET_PREFIXES[getBridgeConfig().network]);
    const utxos = await fetchAddressUtxos(senderAddress);
    if(!utxos){
        throw new Error("Sender address does not have any UTXOs");
    }

    const transaction = new Transaction();

    let selectedUtxos: Utxo[] | null = utxos;

    
    if(params.content){
        transaction.addOutput({
            lockingScript: createOpReturnLockingScript(params.content),
            satoshis: 1,
        });
    }

    if(params.amount){
        selectedUtxos = selectUtxosWithRequiredAmount(utxos, params.amount);

        transaction.addOutput({
            satoshis: params.amount,
            lockingScript: new P2PKH().lock(params.toAddress),
        })
    }

    if(!selectedUtxos){
        throw new Error("Not enough UTXOs to cover the required amount");
    }

    const utxoVoutIndexes = selectedUtxos.reduce((acc, utxo) => {
        acc[utxo.tx_hash] = utxo.tx_pos;
        return acc;
    }, {} as Record<string, number>)
    await chunkArrayAndPerformActionOnChunk(selectedUtxos, TRANSACTIONS_PER_BATCH, async (chunk) => {
        const rawTransactionData = await fetchBulkRawTransactionData(chunk.map(utxo => utxo.tx_hash));
        if(!rawTransactionData) {
            throw new Error("Failed to fetch raw transaction data");
        }
        for (const rawTransaction of rawTransactionData) {
            transaction.addInput({
                sourceTransaction: Transaction.fromHex(rawTransaction.hex),
                sourceOutputIndex: utxoVoutIndexes[rawTransaction.txid],
                unlockingScriptTemplate: new P2PKH().unlock(privateKeyInstance)
            });
        }
    });
    

    transaction.addOutput({
        change: true,
        lockingScript: new P2PKH().lock(senderAddress),
    })

    await transaction.fee(new SatoshisPerKilobyte(1))
    await transaction.sign();

    const result = await broadcastTransaction(transaction.toHex());
    return result;
}