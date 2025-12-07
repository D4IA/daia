import { DaiaRemoteAgreementPointer } from "../../../defines";

export type DaiaReferenceRequirementResolution = {
	pointer: DaiaRemoteAgreementPointer;
};

export type DaiaReferenceRequirementResolver = {
	createSignatureProof: (
		referenceType: string,
	) => Promise<DaiaReferenceRequirementResolution | null>;
};
