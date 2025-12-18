import z from "zod/v3";

export enum DaiaRequirementType {
	SIGN = "sign",
	PAYMENT = "payment",
	AGREEMENT_REFERENCE = "agreement-reference",
}

export enum DaiaPaymentRequirementAuthType {
	SELF_AUTHENTICATED = "self",
	REMOTE = "remote",
}

export const DaiaRequirementSignSchema = z.object({
	type: z.literal(DaiaRequirementType.SIGN),

	/**
	 * Public key to verify sign.
	 */
	pubKey: z.string(),

	/**
	 * Used to make requirement self-signing. When offer creator also wants to sign the offer.
	 */
	sign: z.string().nullable(),

	/**
	 * Random string used to prevent signer from signing potentially malicious data.
	 *
	 * Created by the one who creates offer and requirements.
	 */
	offererNonce: z.string(),
});

export const DaiaRequirementPaymentSchema = z.object({
	type: z.literal(DaiaRequirementType.PAYMENT),

	/**
	 * Target address to transfer money to.
	 */
	to: z.string(),

	/**
	 * Amount of money to transfer.
	 */
	amount: z.number(),

	/**
	 * Defines how payment should be authenticated.
	 */
	auth: z.discriminatedUnion("type", [
		z.object({
			type: z.literal(DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED),
		}),
		z.object({
			type: z.literal(DaiaPaymentRequirementAuthType.REMOTE),

			/**
			 * Nonce, which identifies transaction that would staify this requirement.
			 *
			 * Used to prevent old trnasaction reusing
			 */
			paymentNonce: z.string(),

			/**
			 * If self-paid, this one is empty string.
			 */
			txId: z.string(),
		}),
	]),
});

export const DataRequirementAgreementReferneceSchema = z.object({
	type: z.literal(DaiaRequirementType.AGREEMENT_REFERENCE),

	/**
	 * Protocol-specific. Specifies how given agreement should be referenced.
	 *
	 * Can be empty string.
	 */
	referenceType: z.string(),

	/**
	 * Used when agreement creator wants to reference some agreement.
	 */
	url: z.string().nullable(),
});

export const DaiaProofAgreementReferenceSchema = z.object({
	type: z.literal(DaiaRequirementType.AGREEMENT_REFERENCE),

	/**
	 * Reference to the other agreement. Typically a tx id or URL (eg. bsv://<txid>).
	 */
	reference: z.string(),
});

export const DaiaOfferRequirementSchema = z.discriminatedUnion("type", [
	DaiaRequirementSignSchema,
	DaiaRequirementPaymentSchema,
	DataRequirementAgreementReferneceSchema,
]);

export const DaiaProofSignSchema = z.object({
	type: z.literal(DaiaRequirementType.SIGN),

	/**
	 * Random string used to prevent signer from signing potentially malicious data.
	 *
	 * Created by the one who does the signing.
	 *
	 * In case of transaction requirement being self-signed (already containing sign) this should be empty string.
	 */
	signeeNonce: z.string(),

	/**
	 * Signed offer in serailized form along with both nonces.
	 */
	signature: z.string(),
});

export const DaiaProofPaymentSchema = z.object({
	type: z.literal(DaiaRequirementType.PAYMENT),

	/**
	 * If self-paid, this one is empty string.
	 */
	txId: z.string(),
});

export const DaiaOfferProofSchema = z.discriminatedUnion("type", [
	DaiaProofSignSchema,
	DaiaProofPaymentSchema,
	DaiaProofAgreementReferenceSchema,
]);

export type DaiaOfferRequirement = z.infer<typeof DaiaOfferRequirementSchema>;
export type DaiaRequirementSign = Extract<DaiaOfferRequirement, { type: "sign" }>;
export type DaiaRequirementPayment = Extract<DaiaOfferRequirement, { type: "payment" }>;
export type DaiaRequirementAgreementReference = Extract<
	DaiaOfferRequirement,
	{ type: "agreement-reference" }
>;

export type DaiaOfferProof = z.infer<typeof DaiaOfferProofSchema>;
export type DaiaProofSign = Extract<DaiaOfferProof, { type: "sign" }>;
export type DaiaProofPayment = Extract<DaiaOfferProof, { type: "payment" }>;
export type DaiaProofAgreementReference = Extract<DaiaOfferProof, { type: "agreement-reference" }>;
