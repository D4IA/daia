import { BlockchainTransactionParser } from "@daia/blockchain";
import {
	DaiaAgreementVerifier,
	DaiaAgreementVerifyRequest,
	DaiaAgreementVerifyResponse,
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
}
