interface PaymentProof {
    type: "payment";
    txId: string;
}

interface SignProof {
    type: "sign";
    signeeNonce: string;
    signature: string;
}

interface SignRequirement {
    type: "sign";
    pubKey: string;
    offererNonce: string;
}

interface PaymentRequirement {
    type: "payment";
    to: string;
    amount: number;
    relatedTx: string;
    auth: {
        type: "self"
} | {
    type: "remote";
    paymentNonce: string;
}
}

interface Agreement {
    offerContentSerialized: string;
    proofs: Record<string, PaymentProof | SignProof>;
    naturalLanguageOfferContent: string;
    requirements: Record<string, SignRequirement | PaymentRequirement>;
}

export interface DaiaTransaction {
	txId: string;
    agreement: Agreement;
    timestamp: number;
    confirmed: boolean;
}

