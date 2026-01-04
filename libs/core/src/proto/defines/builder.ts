import { PrivateKey } from "@d4ia/blockchain";
import { DaiaInnerOfferContent, DaiaOfferSelfSignedData, DaiaTransferOfferContent } from "./offer";
import {
    DaiaOfferRequirement,
    DaiaPaymentRequirementAuthType,
    DaiaRemoteAgreementPointer,
    DaiaRemoteAgreementPointerType,
    DaiaRequirementType
} from "./requirement";

type SelfSignData = {
    privateKey: PrivateKey
    requirementUUID: string
}

export class DaiaOfferBuilder {
    private naturalLanguageContent: string = "";
    private offerTypeIdentifier: string = "";

    private privateKeysToSelfSign: SelfSignData[] = [];

    private readonly requirements = new Map<string, DaiaOfferRequirement>();

    public static readonly new = (): DaiaOfferBuilder => {
        return new DaiaOfferBuilder();
    };

    private constructor() { }

    public readonly setNaturalLanguageContent = (content: string): DaiaOfferBuilder => {
        this.naturalLanguageContent = content;
        return this;
    };

    public readonly setOfferTypeIdentifier = (identifier: string): DaiaOfferBuilder => {
        this.offerTypeIdentifier = identifier;
        return this;
    };

    public readonly addRequirement = (
        id: string,
        requirement: DaiaOfferRequirement,
    ): DaiaOfferBuilder => {
        this.requirements.set(id, requirement);
        return this;
    };

    public readonly addSignRequirement = (publicKey: string): DaiaOfferBuilder => {
        const signRequirement: DaiaOfferRequirement = {
            type: DaiaRequirementType.SIGN,
            pubKey: publicKey,
            offererNonce: crypto.randomUUID(),
        };
        this.requirements.set(crypto.randomUUID(), signRequirement);
        return this;
    }
    public readonly addSelfSignedRequirement = (privateKey: PrivateKey): DaiaOfferBuilder => {
        const uuid = crypto.randomUUID()
        this.privateKeysToSelfSign.push({
            privateKey,
            requirementUUID: uuid
        });
        this.requirements.set(uuid, {
            type: DaiaRequirementType.SIGN,
            pubKey: privateKey.toPublicKey().toString(),
            offererNonce: crypto.randomUUID(),
        });
        return this;
    }

    public readonly addPaymentRequirement = (
        to: string,
        amount: number,
        authType: DaiaPaymentRequirementAuthType = DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
        paymentNonce?: string
    ): DaiaOfferBuilder => {
        const paymentRequirement: DaiaOfferRequirement = {
            type: DaiaRequirementType.PAYMENT,
            to,
            amount,
            auth: authType === DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED
                ? { type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED }
                : { 
                    type: DaiaPaymentRequirementAuthType.REMOTE, 
                    paymentNonce: paymentNonce ?? crypto.randomUUID() 
                },
        };
        this.requirements.set(crypto.randomUUID(), paymentRequirement);
        return this;
    }

    public readonly addSelfAuthenticatedPaymentRequirement = (
        to: string,
        amount: number
    ): DaiaOfferBuilder => {
        return this.addPaymentRequirement(to, amount, DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED);
    }

    public readonly addRemotePaymentRequirement = (
        to: string,
        amount: number,
        paymentNonce?: string
    ): DaiaOfferBuilder => {
        return this.addPaymentRequirement(to, amount, DaiaPaymentRequirementAuthType.REMOTE, paymentNonce);
    }

    public readonly addAgreementReferenceRequirement = (
        referenceType: string,
        pointer: DaiaRemoteAgreementPointer
    ): DaiaOfferBuilder => {
        const referenceRequirement: DaiaOfferRequirement = {
            type: DaiaRequirementType.AGREEMENT_REFERENCE,
            referenceType,
            pointer,
        };
        this.requirements.set(crypto.randomUUID(), referenceRequirement);
        return this;
    }

    public readonly addAgreementReferenceByTxId = (
        txId: string,
        referenceType: string = ""
    ): DaiaOfferBuilder => {
        return this.addAgreementReferenceRequirement(referenceType, {
            type: DaiaRemoteAgreementPointerType.TX_ID,
            txId,
        });
    }

    public readonly build = (): DaiaTransferOfferContent => {
        const inner: DaiaInnerOfferContent = {
            naturalLanguageOfferContent: this.naturalLanguageContent,
            offerTypeIdentifier: this.offerTypeIdentifier,
            requirements: Object.fromEntries(this.requirements.entries()),
        }

        const serialized = JSON.stringify(inner);

        const selfSignatures = new Map<string, DaiaOfferSelfSignedData>();

        for (const selfSignData of this.privateKeysToSelfSign) {
            const requirementUUID = selfSignData.requirementUUID;
            const requirement = this.requirements.get(requirementUUID);
            if (!requirement) {
                throw new Error(`Requirement with UUID ${requirementUUID} not found (unreachable)`);
            }

            if (requirement.type !== DaiaRequirementType.SIGN) {
                throw new Error(`Requirement with UUID ${requirementUUID} is not a SIGN requirement (unreachable)`);
            }

            const signature = selfSignData.privateKey.sign(
                requirement.offererNonce +
                "" +  // signeeNonce is empty for self-signed
                serialized
            );

            const signatureDER = signature.toDER("base64");

            selfSignatures.set(requirementUUID, {
                signature: typeof signatureDER === "string" 
                    ? signatureDER 
                    : btoa(String.fromCharCode(...signatureDER))
            });
        }

        return {
            inner: serialized,
            signatures: Object.fromEntries(selfSignatures.entries()),
        }
    }
}
