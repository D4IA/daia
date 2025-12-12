import { describe, expect, test } from "vitest";
import { DaiaPaymentRequirementAuthType, DaiaRequirementType } from "../../defines";
import {
	OfferSignerImpl,
	UnsatisfiedOfferRequirementsError,
	SYMBOL_OFFER_SELF_PAID,
} from "../../sign";

const makeOffer = (requirements: Record<string, any>) => ({
	offerTypeIdentifier: "offer",
	naturalLanguageOfferContent: "content",
	requirements: new Map(Object.entries(requirements)),
});

describe("OfferSignerImpl", () => {
	test("uses inline self-sign proof when provided", async () => {
		const offer = makeOffer({
			sig: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub-key",
				sign: "self-proof",
				offererNonce: "offer-nonce",
			},
		});

		const signer = new OfferSignerImpl();
		const result = await signer.signOffer({ offer });

		const proof = result.agreement.proofs.get("sig");
		expect(proof).toEqual({
			type: DaiaRequirementType.SIGN,
			signeeNonce: "",
			signature: "self-proof",
		});
	});

	test("errors when signer missing for sign requirement", async () => {
		const offer = makeOffer({
			sig: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub-key",
				sign: null,
				offererNonce: "offer-nonce",
			},
		});

		const signer = new OfferSignerImpl();

		await expect(signer.signOffer({ offer })).rejects.toBeInstanceOf(
			UnsatisfiedOfferRequirementsError,
		);
	});

	test("uses agreement referencer when url not provided", async () => {
		const referencer = {
			getAgreementReferenceUrlForType: async (type: string) => `ref-for-${type}`,
		};

		const offer = makeOffer({
			ref: {
				type: DaiaRequirementType.AGREEMENT_REFERENCE,
				referenceType: "rt",
				url: null,
			},
		});

		const signer = new OfferSignerImpl();
		const result = await signer.signOffer({
			offer,
			agreementReferencer: referencer,
		});

		expect(result.agreement.proofs.get("ref")).toEqual({
			type: DaiaRequirementType.AGREEMENT_REFERENCE,
			reference: "ref-for-rt",
		});
	});

	test("fails when agreement referencer returns empty", async () => {
		const referencer = { getAgreementReferenceUrlForType: async () => "" };
		const offer = makeOffer({
			ref: {
				type: DaiaRequirementType.AGREEMENT_REFERENCE,
				referenceType: "rt",
				url: null,
			},
		});

		const signer = new OfferSignerImpl();
		await expect(signer.signOffer({ offer, agreementReferencer: referencer })).rejects.toBeInstanceOf(
			UnsatisfiedOfferRequirementsError,
		);
	});

	test("collects paymentsLeft for self-auth payments", async () => {
		const offer = makeOffer({
			p1: {
				type: DaiaRequirementType.PAYMENT,
				to: "a",
				amount: 50,
				auth: { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED },
			},
			p2: {
				type: DaiaRequirementType.PAYMENT,
				to: "a",
				amount: 25,
				auth: { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED },
			},
		});

		const signer = new OfferSignerImpl();
		const result = await signer.signOffer({
			offer,
			payer: SYMBOL_OFFER_SELF_PAID,
		});

		expect(result.paymentsLeft).toEqual({ a: 75 });
		expect(result.agreement.proofs.get("p1")).toEqual({
			type: DaiaRequirementType.PAYMENT,
			txId: "",
		});
		expect(result.agreement.proofs.get("p2")).toEqual({
			type: DaiaRequirementType.PAYMENT,
			txId: "",
		});
	});

	test("remote payer reduces paymentsLeft and sets txId", async () => {
		const payer = {
			payRequirement: async (_nonce: string, paymentsDue: Record<string, number>) => ({
				txId: "tx456",
				paid: paymentsDue,
			}),
		};
		const offer = makeOffer({
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "dest",
				amount: 30,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "n1",
					txId: "",
				},
			},
		});

		const signer = new OfferSignerImpl();
		const result = await signer.signOffer({ offer, payer });

		expect(result.paymentsLeft).toEqual({});
		expect(result.agreement.proofs.get("pay")).toEqual({
			type: DaiaRequirementType.PAYMENT,
			txId: "tx456",
		});
	});

	test("remote payer partial payment leaves remainder", async () => {
		const payer = {
			payRequirement: async (_nonce: string, _due: Record<string, number>) => ({
				txId: "tx-partial",
				paid: { to: 10 },
			}),
		};
		const offer = makeOffer({
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "to",
				amount: 25,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "n2",
					txId: "",
				},
			},
		});

		const signer = new OfferSignerImpl();
		const result = await signer.signOffer({ offer, payer });

		expect(result.paymentsLeft).toEqual({ to: 15 });
		expect(result.agreement.proofs.get("pay")).toEqual({
			type: DaiaRequirementType.PAYMENT,
			txId: "tx-partial",
		});
	});

	test("remote without payer uses provided txId placeholder", async () => {
		const offer = makeOffer({
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "dest",
				amount: 10,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "n3",
					txId: "known-tx",
				},
			},
		});

		const signer = new OfferSignerImpl();
		const result = await signer.signOffer({ offer });

		expect(result.paymentsLeft).toEqual({ dest: 10 });
		expect(result.agreement.proofs.get("pay")).toEqual({
			type: DaiaRequirementType.PAYMENT,
			txId: "known-tx",
		});
	});

	test("throws with unsatisfied requirements but keeps paymentsLeft", async () => {
		const offer = makeOffer({
			sig: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub-key",
				sign: null,
				offererNonce: "offer-nonce",
			},
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "addr",
				amount: 40,
				auth: { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED },
			},
		});

		const signer = new OfferSignerImpl();
		try {
			await signer.signOffer({ offer });
			throw new Error("should have failed");
		} catch (err) {
			const e = err as UnsatisfiedOfferRequirementsError;
			expect(e.unsatisfiedRequirementIds).toEqual(["sig"]);
			expect(e.paymentsLeft).toEqual({ addr: 40 });
		}
	});
});
