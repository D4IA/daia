import { TransactionLoader } from "../blockchain";
import {
	AgreementVerifier,
	AgreementVerifyError,
	AgreementVerifyErrorType,
	AgreementVerifyQuery,
	AgreementVerifyQueryType,
	AgreementVerifyResult,
	SignatureValidator,
} from "./defines";
import { AgreementVerificationContext } from "./context";
import {
	DaiaPaymentRequirementAuthType,
	DaiaRequirementType,
	DaiaRequirementPayment,
	DaiaRequirementSign,
	DaiaOfferRequirement,
	DaiaOfferProof,
	DaiaProofPayment,
	DaiaProofSign,
	DaiaRequirementAgreementReference,
	DaiaProofAgreementReference,
} from "../defines";
import { DaiaTransactionDataType } from "../blockchain/data";

export class AgreementVerifierImpl implements AgreementVerifier {
	constructor(
		private readonly transactionParser: TransactionLoader,
		private readonly signatureValidator?: SignatureValidator,
	) {}

	public readonly verifyAgreement = async (
		query: AgreementVerifyQuery,
	): Promise<AgreementVerifyResult> => {
		return this.verifyAgreementInternal(query, new Set());
	};

	private readonly verifyAgreementInternal = async (
		query: AgreementVerifyQuery,
		visitedReferences: Set<string>,
	): Promise<AgreementVerifyResult> => {
		const context = await AgreementVerificationContext.fromQuery(this.transactionParser, query);
		const errors = [...context.errors];
		const requirementsSatisfied = new Set<string>();
		const requirementsNotSatisfied = new Set<string>();

		if (!context.offerContent) {
			return {
				agreement: context.agreement,
				errors,
				requirementsNotSatisfied,
				requirementsSatisfied,
			};
		}

		for (const [requirementId, requirement] of context.offerContent.requirements.entries()) {
			const proof = context.agreement.proofs.get(requirementId);

			if (!proof) {
				errors.push({
					requirementId,
					type: AgreementVerifyErrorType.MISSING_PROOF,
					message: "Proof missing for requirement",
				});
				requirementsNotSatisfied.add(requirementId);
				continue;
			}

			const satisfied = await this.verifyRequirement({
				requirementId,
				requirement,
				proof,
				agreementSerialized: context.agreement.offerContentSerialized,
				payments: context.payments,
				errors,
				visitedReferences,
			});

			if (satisfied) {
				requirementsSatisfied.add(requirementId);
			} else {
				requirementsNotSatisfied.add(requirementId);
			}
		}

		return {
			agreement: context.agreement,
			errors,
			requirementsNotSatisfied,
			requirementsSatisfied,
		};
	};

	private readonly verifyRequirement = async (params: {
		requirementId: string;
		requirement: DaiaOfferRequirement;
		proof: DaiaOfferProof;
		agreementSerialized: string;
		payments: Record<string, number>;
		errors: AgreementVerifyError[];
		visitedReferences: Set<string>;
	}): Promise<boolean> => {
		const {
			requirement,
			proof,
			requirementId,
			agreementSerialized,
			payments,
			errors,
			visitedReferences,
		} = params;

		switch (requirement.type) {
			case DaiaRequirementType.SIGN: {
				if (proof.type !== DaiaRequirementType.SIGN) {
					errors.push({
						requirementId,
						type: AgreementVerifyErrorType.INVALID_PROOF,
						message: `Proof type ${proof.type} does not match requirement type ${requirement.type}`,
					});
					return false;
				}

				return this.verifySignRequirement(
					requirementId,
					requirement,
					proof,
					agreementSerialized,
					errors,
				);
			}
			case DaiaRequirementType.PAYMENT: {
				if (proof.type !== DaiaRequirementType.PAYMENT) {
					errors.push({
						requirementId,
						type: AgreementVerifyErrorType.INVALID_PROOF,
						message: `Proof type ${proof.type} does not match requirement type ${requirement.type}`,
					});
					return false;
				}

				return this.verifyPaymentRequirement(requirementId, requirement, proof, payments, errors);
			}
			case DaiaRequirementType.AGREEMENT_REFERENCE: {
				if (proof.type !== DaiaRequirementType.AGREEMENT_REFERENCE) {
					errors.push({
						requirementId,
						type: AgreementVerifyErrorType.INVALID_PROOF,
						message: `Proof type ${proof.type} does not match requirement type ${requirement.type}`,
					});
					return false;
				}

				return this.verifyAgreementReferenceRequirement(
					requirementId,
					requirement,
					proof,
					errors,
					visitedReferences,
				);
			}
			default: {
				const unknownType = (requirement as { type: string }).type;
				errors.push({
					requirementId,
					type: AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED,
					message: `Unsupported requirement type ${unknownType}`,
				});
				return false;
			}
		}
	};

	private readonly verifyAgreementReferenceRequirement = async (
		requirementId: string,
		requirement: DaiaRequirementAgreementReference,
		proof: DaiaProofAgreementReference,
		errors: AgreementVerifyError[],
		visitedReferences: Set<string>,
	): Promise<boolean> => {
		const reference = proof.reference || requirement.url || "";

		if (!reference) {
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Missing referenced agreement location",
			});
			return false;
		}

		const query: AgreementVerifyQuery = {
			type: AgreementVerifyQueryType.URL,
			url: reference,
		};

		if (visitedReferences.has(reference)) {
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED,
				message: "Agreement reference recursion detected",
			});
			return false;
		}

		visitedReferences.add(reference);
		const result = await this.verifyAgreementInternal(query, visitedReferences);
		visitedReferences.delete(reference);
		const failed = result.errors.length > 0 || result.requirementsNotSatisfied.size > 0;

		if (failed) {
			const nestedErrorMessages =
				result.errors.map((err) => err.message).join("; ") ||
				"Referenced agreement requirements not satisfied";
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED,
				message: `Referenced agreement verification failed: ${nestedErrorMessages}`,
			});
		}

		return !failed;
	};

	private readonly verifySignRequirement = async (
		requirementId: string,
		requirement: DaiaRequirementSign,
		proof: DaiaProofSign,
		agreementSerialized: string,
		errors: AgreementVerifyError[],
	): Promise<boolean> => {
		if (!this.signatureValidator) {
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "No signature validator configured",
			});
			return false;
		}

		const message = JSON.stringify({
			offerContentSerialized: agreementSerialized,
			offererNonce: requirement.offererNonce,
			signeeNonce: proof.signeeNonce,
		});

		const valid = await this.signatureValidator.verifySignature({
			pubKey: requirement.pubKey,
			message,
			signature: proof.signature,
		});

		if (!valid) {
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Signature validation failed",
			});
		}

		return valid;
	};

	private readonly verifyPaymentRequirement = async (
		requirementId: string,
		requirement: DaiaRequirementPayment,
		proof: DaiaProofPayment,
		payments: Record<string, number>,
		errors: AgreementVerifyError[],
	): Promise<boolean> => {
		if (
			requirement.auth.type === DaiaPaymentRequirementAuthType.REMOTE &&
			requirement.auth.txId &&
			proof.txId &&
			requirement.auth.txId !== proof.txId
		) {
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Payment txId does not match requirement",
			});
			return false;
		}

		let paymentSource = payments;

		if (requirement.auth.type === DaiaPaymentRequirementAuthType.REMOTE) {
			const targetTxId = proof.txId || requirement.auth.txId;

			if (targetTxId) {
				const remote = await this.transactionParser.fetchById(targetTxId);

				if (!remote) {
					errors.push({
						requirementId,
						type: AgreementVerifyErrorType.INVALID_PROOF,
						message: `Payment transaction ${targetTxId} not found`,
					});
					return false;
				}

				if (
					remote.data?.type === DaiaTransactionDataType.PAYMENT_IDENTIFIER &&
					remote.data.paymentNonce !== requirement.auth.paymentNonce
				) {
					errors.push({
						requirementId,
						type: AgreementVerifyErrorType.INVALID_PROOF,
						message: "Payment nonce does not match remote transaction",
					});
					return false;
				}

				paymentSource = remote.payments;
			}
		}

		const paid = paymentSource[requirement.to] ?? 0;
		const satisfied = paid >= requirement.amount;

		if (!satisfied) {
			errors.push({
				requirementId,
				type: AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED,
				message: `Payment requirement not satisfied. Expected ${requirement.amount}, received ${paid}`,
			});
		}

		return satisfied;
	};
}
