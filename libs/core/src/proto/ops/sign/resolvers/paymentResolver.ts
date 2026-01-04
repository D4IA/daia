import { CreatedBlockchainTransactionHandle } from "@d4ia/blockchain-bridge";
import { DaiaRequirementPayment } from "../../../defines";

export enum DaiaPaymentRequirementResolutionType {
	SELF_AUTHENTICATED = "self-authenticated",
	REMOTE_TX = "remote-tx",
}

export type DaiaPaymentRequirementResolution =
	| {
			type: DaiaPaymentRequirementResolutionType.REMOTE_TX;
			handle: CreatedBlockchainTransactionHandle;
	  }
	| {
			type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED;
			payments: {
				[to: string]: number;
			};
	  };

export type DaiaPaymentRequirementResolver = {
	createPaymentProof: (
		requirement: DaiaRequirementPayment,
	) => Promise<DaiaPaymentRequirementResolution | null>;
};
