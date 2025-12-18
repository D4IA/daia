import { describe, expect, test } from "vitest";
import { OfferSignerImpl } from "..";
import { AgreementVerifierImpl } from "../../verify";
import { TransactionLoader } from "../../blockchain";
import { DaiaPaymentRequirementAuthType, DaiaRequirementType } from "../../defines";
import { DaiaTransactionData, DaiaTransactionDataType } from "../../blockchain/data";
import { AgreementVerifyQueryType } from "../../verify/defines";
import { UnsatisfiedOfferRequirementsError } from "../errors";

const makeOffer = (requirements: Record<string, any>) => ({
	offerTypeIdentifier: "offer",
	naturalLanguageOfferContent: "content",
	requirements: new Map(Object.entries(requirements)),
});

const makeAgreementTx = (agreement: any): DaiaTransactionData => ({
	type: DaiaTransactionDataType.AGREEMENT,
	agreement,
});

describe("OfferSignerImpl + AgreementVerifierImpl", () => {
	test("signed and verified for sign + payment", async () => {
		const signer = new OfferSignerImpl();
		const signatureProvider = {
			signForPublicKey: async (_pub: string, msg: string) => `sig:${msg}`,
		};
		const payer = {
			payRequirement: async (_nonce: string, paymentsDue: Record<string, number>) => ({
				txId: "tx-remote",
				paid: paymentsDue,
			}),
		};

		const offer = makeOffer({
			s: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub",
				sign: null,
				offererNonce: "o-n",
			},
			p: {
				type: DaiaRequirementType.PAYMENT,
				to: "dest",
				amount: 10,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "pn",
					txId: "",
				},
			},
		});

		const signResult = await signer.signOffer({
			offer,
			signer: signatureProvider,
			payer,
		});

		// Build a loader that returns the agreement transaction and the remote payment tx
		const agreementData = makeAgreementTx(signResult.agreement);
		const paymentTxId = "tx-remote";
		const paymentTxRaw = "payment-raw";
		const agreementRaw = "agreement-raw";

		const loader = new TransactionLoader(
			{
				parseTransaction: async (tx) => {
					if (tx === paymentTxRaw) {
						return {
							data: {
								type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
								paymentNonce: "pn",
							},
							payments: { dest: 10 },
						};
					}
					return { data: agreementData, payments: {} };
				},
			},
			{
				fetchTransactionById: async (id) => (id === paymentTxId ? paymentTxRaw : agreementRaw),
				fetchTransactionByUrl: async () => agreementRaw,
			},
		);
		// Signature validator that expects our constructed message
		const validator = {
			verifySignature: async ({ message }: { message: string }) =>
				message.includes("offererNonce") && message.includes("signeeNonce"),
		};

		const verifier = new AgreementVerifierImpl(loader, validator);
		const result = await verifier.verifyAgreement({
			type: AgreementVerifyQueryType.RAW_TRANSACTION,
			transaction: agreementRaw,
		});

		expect(result.errors).toEqual([]);
		expect(result.requirementsNotSatisfied.size).toBe(0);
		expect(result.requirementsSatisfied.size).toBe(2);
	});

	test("verification fails when signer not provided and proof missing", async () => {
		const signer = new OfferSignerImpl();
		const offer = makeOffer({
			s: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub",
				sign: null,
				offererNonce: "o-n",
			},
		});

		await expect(signer.signOffer({ offer })).rejects.toBeInstanceOf(
			UnsatisfiedOfferRequirementsError,
		);
	});

	test("verifier detects insufficient payment even if signed", async () => {
		const signer = new OfferSignerImpl();
		const signatureProvider = { signForPublicKey: async () => "sig" };
		const offer = makeOffer({
			p: {
				type: DaiaRequirementType.PAYMENT,
				to: "dest",
				amount: 50,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "pn",
					txId: "tx-required",
				},
			},
			s: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub",
				sign: null,
				offererNonce: "o-n",
			},
		});

		const signResult = await signer.signOffer({
			offer,
			signer: signatureProvider,
		});

		// Build transaction missing payment coverage
		const agreementData = makeAgreementTx(signResult.agreement);
		const loader = new TransactionLoader(
			{
				parseTransaction: async () => ({
					data: agreementData,
					payments: { dest: 10 },
				}),
			},
			{
				fetchTransactionById: async () => "raw",
				fetchTransactionByUrl: async () => "raw",
			},
		);
		const validator = { verifySignature: async () => true };
		const verifier = new AgreementVerifierImpl(loader, validator);

		const result = await verifier.verifyAgreement({
			type: AgreementVerifyQueryType.RAW_TRANSACTION,
			transaction: "raw",
		});

		expect(result.requirementsNotSatisfied.has("p")).toBe(true);
		expect(result.errors.some((e) => "requirementId" in e && (e as any).requirementId === "p")).toBe(
			true,
		);
	});
});
