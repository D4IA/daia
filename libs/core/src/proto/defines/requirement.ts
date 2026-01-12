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
	 * Optional reference to a related transaction.
	 * Used to link this payment to a previous agreement (e.g., exit payment referencing entry agreement).
	 */
	relatedTx: z.string().optional(),

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
			 * Nonce, which identifies transaction that would satisfy this requirement.
			 *
			 * Used to prevent old transaction reusing.
			 */
			paymentNonce: z.string(),
		}),
	]),
});

export enum DaiaRemoteAgreementPointerType {
	TX_ID = "tx-id",
}

export const DaiaRemoteAgreementPointerSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(DaiaRemoteAgreementPointerType.TX_ID),
		txId: z.string(),
	}),
]);

export type DaiaRemoteAgreementPointer = z.infer<typeof DaiaRemoteAgreementPointerSchema>;

export const DataRequirementAgreementReferenceSchema = z.object({
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
	pointer: DaiaRemoteAgreementPointerSchema,
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
	DataRequirementAgreementReferenceSchema,
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
	 * Signed offer in serialized form along with both nonces.
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
export type DaiaRequirementSign = Extract<DaiaOfferRequirement, { type: DaiaRequirementType.SIGN }>;
export type DaiaRequirementPayment = Extract<
	DaiaOfferRequirement,
	{ type: DaiaRequirementType.PAYMENT }
>;
export type DaiaRequirementAgreementReference = Extract<
	DaiaOfferRequirement,
	{ type: DaiaRequirementType.AGREEMENT_REFERENCE }
>;

export type DaiaOfferProof = z.infer<typeof DaiaOfferProofSchema>;
export type DaiaOfferProofSign = Extract<DaiaOfferProof, { type: DaiaRequirementType.SIGN }>;
export type DaiaOfferProofPayment = Extract<DaiaOfferProof, { type: DaiaRequirementType.PAYMENT }>;
export type DaiaOfferProofAgreementReference = Extract<
	DaiaOfferProof,
	{ type: DaiaRequirementType.AGREEMENT_REFERENCE }
>;
