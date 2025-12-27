import { BlockchainTransactionFactory, CreatedBlockchainTransactionHandle } from "@daia/blockchain";
import {
	DaiaInnerOfferContent,
	DaiaTransferOfferContent,
	DaiaOfferProof,
	DaiaRequirementType,
	DaiaInnerOfferContentSchema,
	DaiaAgreement,
} from "../../defines";
import { DaiaTransactionDataType } from "../../blockchain";
import {
	DaiaOfferSignRequest,
	DaiaOfferSignResponse,
	DaiaOfferSignResponseType,
	DaiaOfferSigner,
	DaiaOfferSummary,
} from "./defines";
import { DaiaPaymentRequirementResolver, DaiaReferenceRequirementResolver } from "./resolvers";
import { DaiaSignRequirementResolver } from "./resolvers/signResolver";
import { JsonUtils } from "../../../utils/json";

export type DefaultDaiaOfferSignerConfig = {
	signResolver?: DaiaSignRequirementResolver;
	referenceResolver?: DaiaReferenceRequirementResolver;
	paymentResolver?: DaiaPaymentRequirementResolver;

	transactionFactory: BlockchainTransactionFactory;
};

export class DefaultDaiaOfferSigner implements DaiaOfferSigner {
	constructor(private readonly config: DefaultDaiaOfferSignerConfig) {}
	async summarizeOfferContents(offer: DaiaInnerOfferContent): Promise<DaiaOfferSummary> {
		const payments: { [to: string]: number } = {};

		for (const requirementId of Object.keys(offer.requirements)) {
			const requirement = offer.requirements[requirementId];

			if (!requirement) {
				continue;
			}

			if (requirement.type === DaiaRequirementType.PAYMENT) {
				const { to, amount } = requirement;

				if (payments[to]) {
					payments[to] += amount;
				} else {
					payments[to] = amount;
				}
			}
		}

		return {
			payments,
			selfSignedData: {},
		};
	}

	async summarizeOffer(offer: DaiaTransferOfferContent): Promise<DaiaOfferSummary> {
		// Parse internal offer

		const innerOffer = JsonUtils.parseNoThrow(offer.inner, DaiaInnerOfferContentSchema);
		if (!innerOffer) {
			throw new Error("Deserialization of inner offer has failed");
		}

		const res = await this.summarizeOfferContents(innerOffer);

		return {
			...res,
			selfSignedData: offer.signatures ?? {},
		};
	}

	async signOffer(request: DaiaOfferSignRequest): Promise<DaiaOfferSignResponse> {
		const { offer } = request;

		const innerOffer = JsonUtils.parseNoThrow(offer.inner, DaiaInnerOfferContentSchema);
		if (!innerOffer) {
			throw new Error("Deserialization of inner offer has failed");
		}

		const signResolver = this.config.signResolver;
		const paymentResolver = this.config.paymentResolver;
		const referenceResolver = this.config.referenceResolver;

		// Store proofs and track internal transactions
		const proofs: { [requirementId: string]: DaiaOfferProof } = {};
		const internalTransactions: CreatedBlockchainTransactionHandle[] = [];
		const selfAuthenticatedPayments: { [to: string]: number } = {};

		// Process each requirement
		for (const requirementId of Object.keys(innerOffer.requirements)) {
			const requirement = innerOffer.requirements[requirementId];

			if (!requirement) {
				continue;
			}
			if (requirement.type === DaiaRequirementType.SIGN) {
				if (offer.signatures && offer.signatures[requirementId]) {
					proofs[requirementId] = {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "",
						signature: offer.signatures[requirementId].signature,
					};
					continue;
				}

				if (!signResolver) {
					return {
						type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE,
						failedRequirementId: requirementId,
					};
				}

				const resolution = await signResolver.createSignatureProof(
					offer.inner,
					requirement.offererNonce,
					requirement.pubKey,
				);

				if (!resolution) {
					return {
						type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE,
						failedRequirementId: requirementId,
					};
				}

				proofs[requirementId] = {
					type: DaiaRequirementType.SIGN,
					signeeNonce: resolution.nonce,
					signature: resolution.sign,
				};
			}
			// Handle PAYMENT requirements
			else if (requirement.type === DaiaRequirementType.PAYMENT) {
				if (!paymentResolver) {
					return {
						type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE,
						failedRequirementId: requirementId,
					};
				}

				const resolution = await paymentResolver.createPaymentProof(requirement);

				if (!resolution) {
					return {
						type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE,
						failedRequirementId: requirementId,
					};
				}

				if (resolution.type === "remote-tx") {
					// Store the transaction handle for remote payments
					internalTransactions.push(resolution.handle);
					proofs[requirementId] = {
						type: DaiaRequirementType.PAYMENT,
						txId: resolution.handle.id,
					};
				} else {
					// Self-authenticated payment - aggregate for the main transaction
					for (const [to, amount] of Object.entries(resolution.payments)) {
						selfAuthenticatedPayments[to] = (selfAuthenticatedPayments[to] || 0) + amount;
					}
					proofs[requirementId] = {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					};
				}
			}
			// Handle AGREEMENT_REFERENCE requirements
			else if (requirement.type === DaiaRequirementType.AGREEMENT_REFERENCE) {
				if (!referenceResolver) {
					return {
						type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE,
						failedRequirementId: requirementId,
					};
				}

				const resolution = await referenceResolver.createSignatureProof(requirement.referenceType);

				if (!resolution) {
					return {
						type: DaiaOfferSignResponseType.REQUIREMENT_FAILURE,
						failedRequirementId: requirementId,
					};
				}

				let reference = "";
				if (resolution.pointer.type === "tx-id") {
					reference = `${resolution.pointer.txId}`;
				}

				proofs[requirementId] = {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					reference,
				};
			}
		}

		const agreement: DaiaAgreement = {
			offerContent: offer,
			proofs,
		};

		const transaction = await this.config.transactionFactory.makeTransaction({
			payments: selfAuthenticatedPayments,
			customData: JSON.stringify({
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			}),
		});

		return {
			type: DaiaOfferSignResponseType.SUCCESS,
			transaction,
			offer,
			agreement,
			internalTransactions,
		};
	}
}
