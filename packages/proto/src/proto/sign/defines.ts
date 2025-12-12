import { DaiaAgreement, DaiaOfferContent } from "../defines";

export interface OfferSignatureProvider {
	/**
	 * Signs given data using private key for given public key or throws an error.
	 *
	 * Note that user is supposed to provide random nonce to data to sign.
	 */
	signForPublicKey: (publicKey: string, dataToSign: string) => Promise<string>;
}

export interface OfferAgreementReferencer {
	/**
	 * Returns agreement reference.
	 */
	getAgreementReferenceUrlForType: (agreementType: string) => Promise<string>;
}

export type OfferPayerResponse = {
	txId: string;
	paid: {
		[to: string]: number;
	};
};

export interface OfferPayer {
	/**
	 * @returns id of transaction that has the payment done. Null if no payments have been done and transaction was not created.
	 */
	payRequirement: (
		paymentNonce: string,
		paymentsDue: {
			[to: string]: number;
		},
	) => Promise<OfferPayerResponse | null>;
}

export const SYMBOL_OFFER_SELF_PAID = Symbol("offer-self-paid");

export type OfferSignRequest = {
	offer: DaiaOfferContent;
	signer?: OfferSignatureProvider;
	agreementReferencer?: OfferAgreementReferencer;
	payer?: OfferPayer | typeof SYMBOL_OFFER_SELF_PAID;
};

export type OfferSignResponse = {
	agreement: DaiaAgreement;
	paymentsLeft: {
		[to: string]: number;
	};
};
export interface OfferSigner {
	signOffer: (offer: OfferSignRequest) => Promise<OfferSignResponse>;
}
