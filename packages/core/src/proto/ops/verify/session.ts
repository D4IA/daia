import { BlockchainTransactionParser, PublicKey, Signature } from "@daia/blockchain";
import {
	DaiaAgreementVerifyResponse,
	DaiaAgreementVerificationFailure,
	DaiaAgreementVerificationFailureType,
	DaiaAgreementVerificationResult,
	DaiaAgreementVerifyRequest,
} from "./defines";
import {
	DaiaAgreement,
	DaiaAgreementSchema,
	DaiaOfferContent,
	DaiaOfferContentSchema,
	DaiaOfferProof,
	DaiaOfferRequirement,
	DaiaPaymentRequirementAuthType,
	DaiaRemoteAgreementPointer,
	DaiaRequirementType,
} from "../../defines";
import { JsonUtils } from "../../../utils/json";
import { DaiaTransactionDataSchema, DaiaTransactionDataType } from "../../blockchain";

const setEquals = (s1: Set<string>, s2: Set<string>) => {
	return s1.size === s2.size && [...s1].every((x) => s2.has(x));
};

export class DaiaAgreementVerifySession {
	private readonly verificationStack: string[] = [];

	private constructor(
		private readonly blockchainParser: BlockchainTransactionParser,
		private readonly initialRequest: DaiaAgreementVerifyRequest,
	) {}

	public static readonly make = (
		blockchainParser: BlockchainTransactionParser,
		request: DaiaAgreementVerifyRequest,
	) => {
		return new DaiaAgreementVerifySession(blockchainParser, request);
	};

	private readonly internalVerifyAgreementRecursiveBegin = async (
		ptr: DaiaRemoteAgreementPointer,
	): Promise<DaiaAgreementVerificationFailure | null> => {
		const tx = await this.blockchainParser.findTransactionById(ptr.txId);
		if (!tx || !tx.data.customData) {
			return {
				type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
			};
		}

		// If transaction is already verified, no need to check it again
		// This prevents infinite recursion, if one such input data set was provided
		if (this.verificationStack.some((x) => x === tx.id)) {
			return null;
		}

		const agreement: DaiaAgreement | null = JsonUtils.parseNoThrow(
			tx.data.customData,
			DaiaAgreementSchema,
		);
		if (!agreement) {
			return {
				type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
			};
		}

		this.verificationStack.push(ptr.txId);

		const res = await this.verifyAgreement({
			agreement,
			transactionData: {
				payments: tx.data.payments,
			},
		});

		if (res.result !== DaiaAgreementVerificationResult.PASSED) {
			return res.failure;
		}

		return null;
	};

	private readonly verifyAgreement = async (
		request: DaiaAgreementVerifyRequest,
	): Promise<DaiaAgreementVerifyResponse> => {
		const { agreement, transactionData } = request;
		const content: DaiaOfferContent = DaiaOfferContentSchema.parse(
			JSON.parse(agreement.offerContentSerialized),
		);

		if (
			!setEquals(new Set(Object.keys(content.requirements)), new Set(Object.keys(agreement.proofs)))
		) {
			return {
				result: DaiaAgreementVerificationResult.FAILED,
				failure: {
					type: DaiaAgreementVerificationFailureType.OTHER,
				},
			};
		}

		for (const key of Object.keys(content.requirements)) {
			const req = content.requirements[key];
			const proof = request.agreement.proofs[key];

			if (!req || !proof) {
				throw new Error(`Unreachable`);
			}

			const failure = await this.checkRequirementProofPair(
				req,
				proof,
				request.agreement.offerContentSerialized,
				transactionData?.payments ?? null,
			);

			if (failure) {
				return {
					result: DaiaAgreementVerificationResult.FAILED,
					failure,
				};
			}
		}

		return {
			result: DaiaAgreementVerificationResult.PASSED,
			totalAgreementPayments: transactionData?.payments ?? null,
		};
	};

	private readonly checkRequirementProofPair = async (
		req: DaiaOfferRequirement,
		proof: DaiaOfferProof,
		rawOfferData: string,
		paymentsData: { [to: string]: number } | null,
	): Promise<DaiaAgreementVerificationFailure | null> => {
		if (req.type !== proof.type) {
			return {
				type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
			};
		}

		if (req.type === DaiaRequirementType.SIGN && proof.type === DaiaRequirementType.SIGN) {
			// HACK: use adapter here instead of assuming that SDK is the only way to handle that
			const publicKey = PublicKey.fromString(req.pubKey);
			const signature = proof.signature;
			if (!signature) {
				return {
					type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
				};
			}

			let res = false;
			try {
				res = publicKey.verify(
					req.offererNonce + proof.signeeNonce + rawOfferData,
					Signature.fromDER(signature, "base64"),
				);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (_e) {
				// This may throw if signature is not valid DER.
				// Just ignore that case.
			}

			if (!res) {
				return {
					type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
				};
			}

			// PASS
		} else if (
			req.type === DaiaRequirementType.PAYMENT &&
			proof.type === DaiaRequirementType.PAYMENT
		) {
			if (req.auth.type === DaiaPaymentRequirementAuthType.REMOTE) {
				const tx = await this.blockchainParser.findTransactionById(proof.txId);

				if (!tx) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				if (tx.data.payments[req.to] !== req.amount) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				if (!tx.data.customData) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				const txData = DaiaTransactionDataSchema.parse(JSON.parse(tx.data.customData));
				if (txData.type !== DaiaTransactionDataType.PAYMENT_IDENTIFIER) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				if (txData.paymentNonce !== req.auth.paymentNonce) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				// PASS
			} else if (req.auth.type === DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED) {
				// TODO: custom failure type here
				if (!paymentsData) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				if (paymentsData[req.to] !== req.amount) {
					return {
						type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
					};
				}

				// PASS
			}
		} else if (req.type === DaiaRequirementType.AGREEMENT_REFERENCE) {
			return this.internalVerifyAgreementRecursiveBegin(req.pointer);
		} else {
			throw new Error(`Unknown request type provided: ${req.type}`);
		}

		return null;
	};

	public readonly run = async (): Promise<DaiaAgreementVerifyResponse> => {
		return await this.verifyAgreement(this.initialRequest);
	};
}
