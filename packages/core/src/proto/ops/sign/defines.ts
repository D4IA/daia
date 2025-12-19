import { CreatedBlockchainTransactionHandle } from "@daia/blockchain";
import { DaiaAgreement, DaiaOfferContent } from "../../defines";
import { DaiaSignRequirementResolver } from "./resolvers/signResolver";

export type DaiaOfferSignRequest = {
	signFactory?: DaiaSignRequirementResolver;
	offer: DaiaOfferContent;
};

export enum DaiaOfferSignResponseType {
	SUCCESS = "success",
	FAILURE = "failure",
}

export type DaiaOfferSignResponse =
	| {
			type: DaiaOfferSignResponseType.SUCCESS;
			transaction: CreatedBlockchainTransactionHandle;
			offer: DaiaOfferContent;
			agreement: DaiaAgreement;

			/**
			 * Transactions created during payment resolution process.
			 */
			internalTransactions: CreatedBlockchainTransactionHandle[];
	  }
	| {
			type: DaiaOfferSignResponseType.FAILURE;
			failedRequirementId: string;
	  };

export type DaiaOfferSummary = {
	payments: {
		[to: string]: number;
	};
};

export interface DaiaOfferSigner {
	summarizeOffer: (offer: DaiaOfferContent) => Promise<DaiaOfferSummary>;
	signOffer: (request: DaiaOfferSignRequest) => Promise<DaiaOfferSignResponse>;
}
