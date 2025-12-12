import { describe, expect, test } from "vitest";
import { DaiaPaymentRequirementAuthType, DaiaRequirementType, DaiaProofSign } from "../../defines";
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

describe("signOffer", () => {
	test("creates proofs and returns paymentsLeft", async () => {
		const captured: { pubKey: string; data: string }[] = [];
		const signer = {
			signForPublicKey: async (pubKey: string, data: string) => {
				captured.push({ pubKey, data });
				return "sig-value";
			},
		};

		const agreementReferencer = {
			getAgreementReferenceUrlForType: async () => "bsv://ref",
		};

		const offer = makeOffer({
			sig: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub-key",
				sign: null,
				offererNonce: "offer-nonce",
			},
			ref: {
				type: DaiaRequirementType.AGREEMENT_REFERENCE,
				referenceType: "rt",
				url: null,
			},
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "addr",
				amount: 100,
				auth: { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED },
			},
		});

		const signerImpl = new OfferSignerImpl();

		const result = await signerImpl.signOffer({
			offer,
			signer,
			agreementReferencer,
			payer: SYMBOL_OFFER_SELF_PAID,
		});

		expect(result.paymentsLeft).toEqual({ addr: 100 });

		const signProof = result.agreement.proofs.get("sig") as DaiaProofSign;
		expect(signProof.type).toBe(DaiaRequirementType.SIGN);
		expect(signProof.signature).toBe("sig-value");
		expect(signProof.signeeNonce).toBeTruthy();

		expect(captured[0]?.pubKey).toBe("pub-key");
		const message = JSON.parse(captured[0]?.data ?? "{}") as {
			offerContentSerialized: string;
			offererNonce: string;
			signeeNonce: string;
		};
		expect(message.offerContentSerialized).toBe(result.agreement.offerContentSerialized);
		expect(message.offererNonce).toBe("offer-nonce");
		expect(message.signeeNonce).toBe(signProof.signeeNonce);

		const refProof = result.agreement.proofs.get("ref");
		expect(refProof).toMatchObject({
			type: DaiaRequirementType.AGREEMENT_REFERENCE,
			reference: "bsv://ref",
		});

		const payProof = result.agreement.proofs.get("pay");
		expect(payProof).toMatchObject({
			type: DaiaRequirementType.PAYMENT,
			txId: "",
		});
	});

	test("throws when non-payment requirements cannot be satisfied", async () => {
		const offer = makeOffer({
			sig: {
				type: DaiaRequirementType.SIGN,
				pubKey: "pub-key",
				sign: null,
				offererNonce: "offer-nonce",
			},
			ref: {
				type: DaiaRequirementType.AGREEMENT_REFERENCE,
				referenceType: "rt",
				url: null,
			},
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "addr",
				amount: 10,
				auth: { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED },
			},
		});

		const signerImpl = new OfferSignerImpl();

		await expect(signerImpl.signOffer({ offer })).rejects.toBeInstanceOf(
			UnsatisfiedOfferRequirementsError,
		);

		try {
			await signerImpl.signOffer({ offer });
		} catch (err) {
			const e = err as UnsatisfiedOfferRequirementsError;
			expect(e.unsatisfiedRequirementIds).toEqual(expect.arrayContaining(["sig", "ref"]));
			expect(e.paymentsLeft).toEqual({ addr: 10 });
		}
	});

	test("reduces paymentsLeft when payer covers remote requirement", async () => {
		const payer = {
			payRequirement: async (_nonce: string, paymentsDue: Record<string, number>) => ({
				txId: "tx123",
				paid: paymentsDue,
			}),
		};

		const offer = makeOffer({
			pay: {
				type: DaiaRequirementType.PAYMENT,
				to: "dest",
				amount: 75,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "nonce",
					txId: "",
				},
			},
		});

		const signerImpl = new OfferSignerImpl();

		const result = await signerImpl.signOffer({ offer, payer });

		expect(result.paymentsLeft).toEqual({});
		expect(result.agreement.proofs.get("pay")).toMatchObject({
			type: DaiaRequirementType.PAYMENT,
			txId: "tx123",
		});
	});
});
