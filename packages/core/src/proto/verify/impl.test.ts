import { describe, expect, test } from "vitest";
import { AgreementVerifierImpl } from "./impl";
import {
	AgreementVerifyErrorType,
	AgreementVerifyQueryType,
	SignatureValidator,
	SignatureVerifyParams,
} from "./defines";
import {
	DaiaAgreement,
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaRequirementPayment,
	DaiaRequirementSign,
	DaiaRequirementAgreementReference,
	DaiaProofAgreementReference,
} from "../defines";
import { TransactionLoader } from "../blockchain";
import { DaiaTransactionData, DaiaTransactionDataType } from "../blockchain/data";

class StaticSignatureValidator implements SignatureValidator {
	constructor(private readonly result: boolean) {}
	async verifySignature() {
		return this.result;
	}
}

class ExpectingSignatureValidator implements SignatureValidator {
	constructor(private readonly expected: SignatureVerifyParams) {}

	async verifySignature(params: SignatureVerifyParams) {
		return (
			params.pubKey === this.expected.pubKey &&
			params.message === this.expected.message &&
			params.signature === this.expected.signature
		);
	}
}

const makeLoader = (data: DaiaTransactionData | null, payments: Record<string, number> = {}) =>
	new TransactionLoader(
		{ parseTransaction: async () => ({ data, payments }) },
		{
			fetchTransactionById: async () => "",
			fetchTransactionByUrl: async () => "",
		},
	);

const signRequirement: DaiaRequirementSign = {
	type: DaiaRequirementType.SIGN,
	pubKey: "02a1633caf7bf7a0d8de8ad1c2f5d78c2b5af630c0e2b0991c3be0c7439a3af1f3",
	sign: null,
	offererNonce: "offer-nonce",
};

const paymentRequirement: DaiaRequirementPayment = {
	type: DaiaRequirementType.PAYMENT,
	to: "abcd",
	amount: 500,
	auth: { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED },
};

const buildSignMessage = (
	agreementSerialized: string,
	requirement: DaiaRequirementSign,
	signeeNonce: string,
) =>
	JSON.stringify({
		offerContentSerialized: agreementSerialized,
		offererNonce: requirement.offererNonce,
		signeeNonce,
	});

describe("schema and requirement validation", () => {
	test("flags invalid offer content schema", async () => {
		const agreement: DaiaAgreement = {
			offerContentSerialized: "not-json",
			proofs: new Map(),
		} as unknown as DaiaAgreement;
		const data: DaiaTransactionData = {
			type: DaiaTransactionDataType.AGREEMENT,
			agreement,
		};
		const loader = makeLoader(data);
		const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

		const result = await verifier.verifyAgreement({
			type: AgreementVerifyQueryType.RAW_TRANSACTION,
			transaction: "tx",
		});

		expect(
			result.errors.find((e) => e.type === AgreementVerifyErrorType.SCHEMA_INVALID),
		).toBeDefined();
	});

	test("rejects unsupported requirement type during schema validation", async () => {
		const requirementId = "unknown-req";
		const offerContentSerialized = JSON.stringify({
			offerTypeIdentifier: "t",
			naturalLanguageOfferContent: "n",
			requirements: { [requirementId]: { type: "unknown" } },
		});
		const agreement: DaiaAgreement = {
			offerContentSerialized,
			proofs: new Map([[requirementId, { type: "unknown" } as any]]),
		} as DaiaAgreement;
		const data: DaiaTransactionData = {
			type: DaiaTransactionDataType.AGREEMENT,
			agreement,
		};
		const loader = makeLoader(data);
		const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

		const result = await verifier.verifyAgreement({
			type: AgreementVerifyQueryType.RAW_TRANSACTION,
			transaction: "tx",
		});

		expect(
			result.errors.find((e) => e.type === AgreementVerifyErrorType.SCHEMA_INVALID),
		).toBeDefined();
	});
});

const selfSignedRequirement: DaiaRequirementSign = {
	type: DaiaRequirementType.SIGN,
	pubKey: "03e6dc1f6f8b6cc847ef807c9fdb3a7f40c2b4be7c4f16d9c3a5b5d1b1c9a9a9a9",
	sign: "self-signed-proof",
	offererNonce: "offer-nonce-self",
};

const agreementReferenceRequirement = (
	url: string | null = null,
): DaiaRequirementAgreementReference => ({
	type: DaiaRequirementType.AGREEMENT_REFERENCE,
	referenceType: "tx",
	url,
});

const agreementReferenceProof = (reference: string): DaiaProofAgreementReference => ({
	type: DaiaRequirementType.AGREEMENT_REFERENCE,
	reference,
});

const makeLoaderWithTransactions = (
	transactions: Record<
		string,
		{ data: DaiaTransactionData | null; payments?: Record<string, number> }
	>,
): TransactionLoader =>
	new TransactionLoader(
		{
			parseTransaction: async (tx) => {
				const entry = transactions[tx];
				return entry
					? { data: entry.data, payments: entry.payments ?? {} }
					: { data: null, payments: {} };
			},
		},
		{
			fetchTransactionById: async (id) => (transactions[id] ? id : null),
			fetchTransactionByUrl: async (url) => (transactions[url] ? url : null),
		},
	);

describe("AgreementVerifierImpl", () => {
	const agreementBase: Omit<DaiaAgreement, "proofs"> = {
		offerContentSerialized: JSON.stringify({
			offerTypeIdentifier: "t",
			naturalLanguageOfferContent: "n",
			requirements: {},
		}),
	};

	describe("transaction loading", () => {
		test("fetches transaction by URL query", async () => {
			const requirementId = "sign-url";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "sig",
							signature: "deadbeef",
						},
					],
				]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = new TransactionLoader(
				{
					parseTransaction: async (tx) =>
						tx === "raw-tx" ? { data, payments: {} } : { data: null, payments: {} },
				},
				{
					fetchTransactionById: async (id) => (id === "txid" ? "raw-tx" : null),
					fetchTransactionByUrl: async (url) => (url === "bsv://txid" ? "raw-tx" : null),
				},
			);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.URL,
				url: "bsv://txid",
			});

			expect(result.errors).toEqual([]);
			expect(result.requirementsSatisfied.has(requirementId)).toBe(true);
		});

		test("fetches transaction by id query", async () => {
			const requirementId = "sign-id";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "sig",
							signature: "deadbeef",
						},
					],
				]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = new TransactionLoader(
				{
					parseTransaction: async (tx) =>
						tx === "raw-tx" ? { data, payments: {} } : { data: null, payments: {} },
				},
				{
					fetchTransactionById: async (id) => (id === "txid" ? "raw-tx" : null),
					fetchTransactionByUrl: async () => null,
				},
			);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.TRANSACTION_ID,
				id: "txid",
			});

			expect(result.errors).toEqual([]);
			expect(result.requirementsSatisfied.has(requirementId)).toBe(true);
		});

		test("fails when transaction id not found", async () => {
			const loader = new TransactionLoader(
				{ parseTransaction: async () => ({ data: null, payments: {} }) },
				{
					fetchTransactionById: async () => null,
					fetchTransactionByUrl: async () => null,
				},
			);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.TRANSACTION_ID,
				id: "missing",
			});

			expect(result.errors).toContainEqual({
				type: AgreementVerifyErrorType.FETCH_FAILED,
				message: "Transaction missing not found",
			});
		});
	});

	describe("sign requirements", () => {
		test("marks missing proof as error and unsatisfied", async () => {
			const requirementId = "r1";
			const agreement: DaiaAgreement = { ...agreementBase, proofs: new Map() };
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = new TransactionLoader(
				{ parseTransaction: async () => ({ data, payments: {} }) },
				{
					fetchTransactionById: async () => "",
					fetchTransactionByUrl: async (url) => (url === "bsv://test" ? "fetched" : ""),
				},
			);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.MISSING_PROOF,
				message: "Proof missing for requirement",
			});
		});

		test("rejects proof type mismatch", async () => {
			const requirementId = "r2";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "" }]]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: `Proof type ${DaiaRequirementType.PAYMENT} does not match requirement type ${DaiaRequirementType.SIGN}`,
			});
		});

		test("accepts valid signature", async () => {
			const requirementId = "sign-ok";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "sig",
							signature: "deadbeef",
						},
					],
				]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsSatisfied.has(requirementId)).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		test("fails invalid signature", async () => {
			const requirementId = "sign-bad";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "sig",
							signature: "deadbeef",
						},
					],
				]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(false));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Signature validation failed",
			});
		});

		test("fails when no signature validator configured", async () => {
			const requirementId = "sign-no-validator";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "sig",
							signature: "deadbeef",
						},
					],
				]),
			};
			agreement.offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const verifier = new AgreementVerifierImpl(loader);

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "No signature validator configured",
			});
		});

		test("accepts single self-signed requirement", async () => {
			const signId = "sign-self-only";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						signId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "",
							signature: "bead",
						},
					],
				]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [signId]: selfSignedRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.errors.length).toBe(0);
			expect(result.requirementsSatisfied.has(signId)).toBe(true);
		});

		test("rejects signature when public key does not match", async () => {
			const requirementId = "sign-pub-mismatch";
			const agreementSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "sig",
							signature: "deadbeef",
						},
					],
				]),
				offerContentSerialized: agreementSerialized,
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const validator = new ExpectingSignatureValidator({
				pubKey: "other-pubkey",
				message: buildSignMessage(agreementSerialized, signRequirement, "sig"),
				signature: "deadbeef",
			});
			const verifier = new AgreementVerifierImpl(loader, validator);

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Signature validation failed",
			});
		});

		test("rejects signature when nonce is tampered", async () => {
			const requirementId = "sign-nonce";
			const originalSigneeNonce = "sig-original";
			const tamperedSigneeNonce = "sig-tampered";
			const agreementSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: signRequirement },
			});
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: tamperedSigneeNonce,
							signature: "deadbeef",
						},
					],
				]),
				offerContentSerialized: agreementSerialized,
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data);
			const validator = new ExpectingSignatureValidator({
				pubKey: signRequirement.pubKey,
				message: buildSignMessage(agreementSerialized, signRequirement, originalSigneeNonce),
				signature: "deadbeef",
			});
			const verifier = new AgreementVerifierImpl(loader, validator);

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Signature validation failed",
			});
		});
	});

	describe("payment requirements", () => {
		test("self referenced valid payment uses current transaction", async () => {
			const requirementIdPayOk = "pay-ok";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementIdPayOk, { type: DaiaRequirementType.PAYMENT, txId: "" }]]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementIdPayOk]: paymentRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const payments = { [paymentRequirement.to]: paymentRequirement.amount };
			const loader = makeLoader(data, payments);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsSatisfied.has(requirementIdPayOk)).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		test("self referenced invalid payment uses current transaction", async () => {
			const requirementIdPayBad = "pay-bad";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementIdPayBad, { type: DaiaRequirementType.PAYMENT, txId: "" }]]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementIdPayBad]: paymentRequirement },
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const payments = {
				[paymentRequirement.to]: paymentRequirement.amount - 1,
			};
			const loader = makeLoader(data, payments);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementIdPayBad)).toBe(true);
			expect(result.errors[0]?.type).toBe(AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED);
		});

		test("rejects payment proof when proof type mismatches", async () => {
			const requirementId = "pay-type-mismatch";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						requirementId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "n",
							signature: "sig",
						},
					],
				]),
			};
			agreement.offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: paymentRequirement },
			});
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoader(data, {});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: `Proof type ${DaiaRequirementType.SIGN} does not match requirement type ${DaiaRequirementType.PAYMENT}`,
			});
		});

		test("rejects payment proof when txId does not match remote auth requirement", async () => {
			const requirementId = "pay-remote";
			const remotePaymentRequirement: DaiaRequirementPayment = {
				...paymentRequirement,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					txId: "tx-required",
					paymentNonce: "n",
				},
			};
			const agreementSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: { [requirementId]: remotePaymentRequirement },
			});
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "tx-other" }]]),
				offerContentSerialized: agreementSerialized,
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const payments = { [paymentRequirement.to]: paymentRequirement.amount };
			const loader = makeLoader(data, payments);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Payment txId does not match requirement",
			});
		});

		test("remote transaction valid payment", async () => {
			const requirementId = "pay-remote-valid";
			const remoteRequirement: DaiaRequirementPayment = {
				...paymentRequirement,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					txId: "remote-tx",
					paymentNonce: "pnonce",
				},
			};
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "remote-tx" }]]),
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: { [requirementId]: remoteRequirement },
				}),
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoaderWithTransactions({
				tx: { data, payments: {} },
				"remote-tx": {
					data: {
						type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
						paymentNonce: "pnonce",
					},
					payments: { [paymentRequirement.to]: paymentRequirement.amount },
				},
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsSatisfied.has(requirementId)).toBe(true);
			expect(result.errors.length).toBe(0);
		});

		test("remote transaction invalid payment", async () => {
			const requirementId = "pay-remote-invalid";
			const remoteRequirement: DaiaRequirementPayment = {
				...paymentRequirement,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					txId: "remote-tx",
					paymentNonce: "pnonce",
				},
			};
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "remote-tx" }]]),
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: { [requirementId]: remoteRequirement },
				}),
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoaderWithTransactions({
				tx: { data, payments: {} },
				"remote-tx": {
					data: {
						type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
						paymentNonce: "pnonce",
					},
					payments: { [paymentRequirement.to]: paymentRequirement.amount - 10 },
				},
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors[0]?.type).toBe(AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED);
		});

		test("fails when payment nonce does not match remote transaction", async () => {
			const requirementId = "pay-remote-nonce";
			const remoteRequirement: DaiaRequirementPayment = {
				...paymentRequirement,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					txId: "remote-tx",
					paymentNonce: "expected",
				},
			};
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "remote-tx" }]]),
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: { [requirementId]: remoteRequirement },
				}),
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoaderWithTransactions({
				tx: { data, payments: {} },
				"remote-tx": {
					data: {
						type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
						paymentNonce: "other",
					},
					payments: { [paymentRequirement.to]: paymentRequirement.amount },
				},
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Payment nonce does not match remote transaction",
			});
		});

		test("fails when remote payment transaction not found", async () => {
			const requirementId = "pay-remote-missing";
			const remoteRequirement: DaiaRequirementPayment = {
				...paymentRequirement,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					txId: "missing-tx",
					paymentNonce: "pnonce",
				},
			};
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "missing-tx" }]]),
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: { [requirementId]: remoteRequirement },
				}),
			};
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const loader = makeLoaderWithTransactions({ tx: { data, payments: {} } });
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: "Payment transaction missing-tx not found",
			});
		});
	});

	describe("mixed requirements", () => {
		test("handles multiple requirements including self-signed signature", async () => {
			const signId = "sign-self";
			const payId = "pay-multi";
			const agreement: DaiaAgreement = {
				...agreementBase,
				proofs: new Map([
					[
						signId,
						{
							type: DaiaRequirementType.SIGN,
							signeeNonce: "",
							signature: "cafebabe",
						},
					],
					[payId, { type: DaiaRequirementType.PAYMENT, txId: "" }],
				]),
			};
			const offerContentSerialized = JSON.stringify({
				offerTypeIdentifier: "t",
				naturalLanguageOfferContent: "n",
				requirements: {
					[signId]: selfSignedRequirement,
					[payId]: paymentRequirement,
				},
			});
			agreement.offerContentSerialized = offerContentSerialized;
			const data: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement,
			};
			const payments = { [paymentRequirement.to]: paymentRequirement.amount };
			const loader = makeLoader(data, payments);
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "tx",
			});

			expect(result.errors.length).toBe(0);
			expect(result.requirementsSatisfied.has(signId)).toBe(true);
			expect(result.requirementsSatisfied.has(payId)).toBe(true);
		});
	});

	describe("agreement reference requirements", () => {
		test("passes when referenced agreement is satisfied via URL", async () => {
			const requirementId = "ref-ok";
			const parentAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: {
						[requirementId]: agreementReferenceRequirement("bsv://child-id"),
					},
				}),
				proofs: new Map([[requirementId, agreementReferenceProof("bsv://child-id")]]),
			};
			const childAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "c",
					naturalLanguageOfferContent: "c",
					requirements: {},
				}),
				proofs: new Map(),
			};
			const parentData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: parentAgreement,
			};
			const childData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: childAgreement,
			};
			const loader = makeLoaderWithTransactions({
				"parent-raw": { data: parentData, payments: {} },
				"bsv://child-id": { data: childData, payments: {} },
				"child-id": { data: childData, payments: {} },
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "parent-raw",
			});

			expect(result.errors).toEqual([]);
			expect(result.requirementsSatisfied.has(requirementId)).toBe(true);
		});

		test("fails when referenced agreement requirement is unsatisfied", async () => {
			const requirementId = "ref-bad";
			const childRequirementId = "child-sign";
			const childAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "c",
					naturalLanguageOfferContent: "c",
					requirements: { [childRequirementId]: signRequirement },
				}),
				proofs: new Map(),
			};
			const parentAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: {
						[requirementId]: agreementReferenceRequirement("bsv://child-id"),
					},
				}),
				proofs: new Map([[requirementId, agreementReferenceProof("bsv://child-id")]]),
			};
			const parentData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: parentAgreement,
			};
			const childData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: childAgreement,
			};
			const loader = makeLoaderWithTransactions({
				"parent-raw": { data: parentData, payments: {} },
				"bsv://child-id": { data: childData, payments: {} },
				"child-id": { data: childData, payments: {} },
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "parent-raw",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors[0]?.type).toBe(AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED);
		});

		test("fails when referenced agreement cannot be fetched by URL", async () => {
			const requirementId = "ref-missing";
			const parentAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: {
						[requirementId]: agreementReferenceRequirement("bsv://missing-id"),
					},
				}),
				proofs: new Map([[requirementId, agreementReferenceProof("bsv://missing-id")]]),
			};
			const parentData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: parentAgreement,
			};
			const loader = makeLoaderWithTransactions({
				"parent-raw": { data: parentData, payments: {} },
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "parent-raw",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors[0]?.type).toBe(AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED);
		});

		test("rejects proof type mismatch for agreement reference", async () => {
			const requirementId = "ref-type";
			const parentAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: {
						[requirementId]: agreementReferenceRequirement("bsv://child-id"),
					},
				}),
				proofs: new Map([[requirementId, { type: DaiaRequirementType.PAYMENT, txId: "" }]]),
			};
			const parentData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: parentAgreement,
			};
			const loader = makeLoaderWithTransactions({
				"parent-raw": { data: parentData, payments: {} },
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "parent-raw",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			expect(result.errors).toContainEqual({
				requirementId,
				type: AgreementVerifyErrorType.INVALID_PROOF,
				message: `Proof type ${DaiaRequirementType.PAYMENT} does not match requirement type ${DaiaRequirementType.AGREEMENT_REFERENCE}`,
			});
		});

		test("fails when referenced agreement fetch by id is missing", async () => {
			const requirementId = "ref-missing-id";
			const parentAgreement: DaiaAgreement = {
				...agreementBase,
				offerContentSerialized: JSON.stringify({
					offerTypeIdentifier: "t",
					naturalLanguageOfferContent: "n",
					requirements: {
						[requirementId]: agreementReferenceRequirement("bsv://child-missing"),
					},
				}),
				proofs: new Map([[requirementId, agreementReferenceProof("bsv://child-missing")]]),
			};
			const parentData: DaiaTransactionData = {
				type: DaiaTransactionDataType.AGREEMENT,
				agreement: parentAgreement,
			};
			const loader = makeLoaderWithTransactions({
				"parent-raw": { data: parentData, payments: {} },
			});
			const verifier = new AgreementVerifierImpl(loader, new StaticSignatureValidator(true));

			const result = await verifier.verifyAgreement({
				type: AgreementVerifyQueryType.RAW_TRANSACTION,
				transaction: "parent-raw",
			});

			expect(result.requirementsNotSatisfied.has(requirementId)).toBe(true);
			const error = result.errors.find(
				(e) => "requirementId" in e && e.requirementId === requirementId,
			);
			expect(error?.message ?? "").toContain("not found");
		});
	});
});
