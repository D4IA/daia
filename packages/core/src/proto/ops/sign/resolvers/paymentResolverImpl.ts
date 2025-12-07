import { BlockchainTransactionFactory } from "@daia/blockchain";
import { DaiaPaymentRequirementAuthType, DaiaRequirementPayment } from "../../../defines";
import { DaiaTransactionDataType } from "../../../blockchain";
import {
	DaiaPaymentRequirementResolution,
	DaiaPaymentRequirementResolutionType,
	DaiaPaymentRequirementResolver,
} from "./paymentResolver";

export class DefaultDaiaPaymentRequirementResolver implements DaiaPaymentRequirementResolver {
	constructor(private readonly transactionFactory: BlockchainTransactionFactory) {}

	async createPaymentProof(
		requirement: DaiaRequirementPayment,
	): Promise<DaiaPaymentRequirementResolution | null> {
		// Handle based on authentication type
		if (requirement.auth.type === DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED) {
			// For self-authenticated payments, we just aggregate the payment data
			// No actual blockchain transaction is needed at this stage
			return {
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					[requirement.to]: requirement.amount,
				},
			};
		} else if (requirement.auth.type === DaiaPaymentRequirementAuthType.REMOTE) {
			// For remote payments, we need to create a blockchain transaction
			// with the payment and proper authentication nonce
			const paymentNonce = requirement.auth.paymentNonce;

			// Create transaction with the payment and nonce in custom data
			const transactionHandle = await this.transactionFactory.makeTransaction({
				payments: {
					[requirement.to]: requirement.amount,
				},
				customData: JSON.stringify({
					type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
					paymentNonce,
				}),
			});

			return {
				type: DaiaPaymentRequirementResolutionType.REMOTE_TX,
				handle: transactionHandle,
			};
		}

		// Unknown authentication type
		return null;
	}
}
