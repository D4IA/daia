import z, { string } from "zod";

export enum DaiaRequirementType {
    Sign = "sign",
    Payment = "payment"
}

export const DaiaOfferRequirementSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal(DaiaRequirementType.Sign),
        pubKey: z.string(),
        /**
         * Random string used to prevent signer from signing potentially malicious data.
         * 
         * Created by the one who creates offer and requirements.
         */
        offererNonce: z.string()
    }),
    z.object({
        type: z.literal(DaiaRequirementType.Payment),
        to: z.string(),
        /**
         * If self-paid, this one is empty string.
         */
        txId: z.string() 
    })
])

export const DaiaOfferContentSchema = z.object({
    naturalLanguageOfferContent: z.string(),
    /**
     * Map of requirement id to requirement.
     */
    requirements: z.map(z.string(), DaiaOfferRequirementSchema)
})

export const DaiaOfferProofSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal(DaiaRequirementType.Sign),
        /**
         * Random string used to prevent signer from signing potentially malicious data.
         * 
         * Created by the one who does the signing.
         */
        signeeNonce: z.string(), 
        signature: z.string()
    }),
    z.object({
        type: z.literal(DaiaRequirementType.Payment),
        to: z.string(),
        /**
         * If self-paid, this one is empty string.
         */
        txId: z.string() 
    })
])

export const DaiaAgreementSchema = z.object({
    /**
     * Serialized offer content, so that signing it can be deterministic, as well as signature verification.
     * 
     * @see DaiaOfferContentSchema
     */
    offerContentSerialized: z.string(),
    /**
     * Map of requirement id to proof for that requirement.
     */
    proofs: z.map(z.string(), DaiaOfferProofSchema)
})

export type DaiaRequirementSign = z.infer<typeof DaiaOfferRequirementSchema> & { type: "sign" };
export type DaiaRequirementPayment = z.infer<typeof DaiaOfferRequirementSchema> & { type: "payment" };
export type DaiaOfferRequirement = z.infer<typeof DaiaOfferRequirementSchema>;
export type DaiaOfferContent = z.infer<typeof DaiaOfferContentSchema>;

export type DaiaProofSign = z.infer<typeof DaiaOfferProofSchema> & { type: "sign" };
export type DaiaProofPayment = z.infer<typeof DaiaOfferProofSchema> & { type: "payment" };
export type DaiaOfferProof = z.infer<typeof DaiaOfferProofSchema>;
export type DaiaAgreement = z.infer<typeof DaiaAgreementSchema>;