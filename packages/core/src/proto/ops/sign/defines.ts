import { CreatedBlockchainTransactionHandle } from "@daia/blockchain";
import {
	DaiaAgreement,
	DaiaInnerOfferContent,
	DaiaOfferSelfSignedData,
	DaiaTransferOfferContent,
} from "../../defines";

export type DaiaOfferSignRequest = {
	offer: DaiaTransferOfferContent;
};

export enum DaiaOfferSignResponseType {
	SUCCESS = "success",
	REQUIREMENT_FAILURE = "req-failure",
}

export type DaiaOfferSignResponse =
	| {
			type: DaiaOfferSignResponseType.SUCCESS;
			transaction: CreatedBlockchainTransactionHandle;
			offer: DaiaTransferOfferContent;
			agreement: DaiaAgreement;

			/**
			 * Transactions created during payment resolution process.
			 */
			internalTransactions: CreatedBlockchainTransactionHandle[];
	  }
	| {
			type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE;
			failedRequirementId: string;
	  };

export type DaiaOfferSummary = {
	content: DaiaInnerOfferContent;
	payments: {
		[to: string]: number;
	};
	selfSignedData: {
		[key: string]: DaiaOfferSelfSignedData;
	};
};

export interface DaiaOfferSigner {
	summarizeOfferContents: (offer: DaiaInnerOfferContent) => Promise<DaiaOfferSummary>;
	summarizeOffer: (offer: DaiaTransferOfferContent) => Promise<DaiaOfferSummary>;
	signOffer: (request: DaiaOfferSignRequest) => Promise<DaiaOfferSignResponse>;
}
