import { createOpReturnLockingScript } from "./opReturnTemplate";
import { Transaction } from "@bsv/sdk";

export const addOpReturnOutput = (transactionRef: Transaction, content: string) => {
    const lockingScript = createOpReturnLockingScript(content);
    transactionRef.addOutput({
        lockingScript,
        satoshis: 1,
    });
}