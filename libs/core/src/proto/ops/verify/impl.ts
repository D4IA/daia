import { BlockchainTransactionParser } from "@d4ia/blockchain";
import { JsonUtils } from "../../../utils/json";
import { DaiaAgreementSchema } from "../../defines";
import { DaiaTransactionDataSchema, DaiaTransactionDataType } from "../../blockchain/data";
import {
	DaiaAgreementVerifier,
	DaiaAgreementVerifyRequest,
	DaiaAgreementVerifyResponse,
	DaiaAgreementFromTransactionResponse,
} from "./defines";
import { DaiaAgreementVerifySession } from "./session";

export class DefaultDaiaAgreementVerifier implements DaiaAgreementVerifier {
	constructor(private readonly blockchainParser: BlockchainTransactionParser) {}

	verifyAgreement = async (
		request: DaiaAgreementVerifyRequest,
	): Promise<DaiaAgreementVerifyResponse> => {
		const session = DaiaAgreementVerifySession.make(this.blockchainParser, request);

		return await session.run();
	};

	getAgreementFromTransaction = async (
		transactionId: string,
	): Promise<DaiaAgreementFromTransactionResponse> => {
		// Download transaction from blockchain
		const tx = await this.blockchainParser.findTransactionById(transactionId);

		// Check if transaction exists and has custom data
		if (!tx || !tx.data.customData) {
			return { found: false };
		}

		// Try to parse as DaiaTransactionData first (wrapped format, as stored by signer)
		const transactionData = JsonUtils.parseNoThrow(tx.data.customData, DaiaTransactionDataSchema);
		
		let agreement = null;
		
		if (transactionData) {
			// Successfully parsed as DaiaTransactionData
			if (transactionData.type === DaiaTransactionDataType.AGREEMENT) {
				agreement = transactionData.agreement;
			} else {
				// It's a valid DaiaTransactionData but not an agreement (e.g., payment-identifier)
				return { found: false };
			}
		} else {
			// Fall back to trying to parse directly as DaiaAgreement (for backward compatibility)
			agreement = JsonUtils.parseNoThrow(tx.data.customData, DaiaAgreementSchema);
		}

		if (!agreement) {
			return { found: false };
		}

		// Verify the agreement
		const verification = await this.verifyAgreement({
			agreement,
			transactionData: {
				payments: tx.data.payments,
			},
		});

		return {
			found: true,
			agreement,
			verification,
		};
	};
}
