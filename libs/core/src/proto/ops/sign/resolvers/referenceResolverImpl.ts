import { DaiaRemoteAgreementPointer } from "../../../defines";
import {
	DaiaReferenceRequirementResolution,
	DaiaReferenceRequirementResolver,
} from "./referenceResolver";

export class DefaultDaiaReferenceRequirementResolver implements DaiaReferenceRequirementResolver {
	constructor(private readonly referenceMap: Map<string, DaiaRemoteAgreementPointer>) {}

	async createSignatureProof(
		referenceType: string,
	): Promise<DaiaReferenceRequirementResolution | null> {
		const pointer = this.referenceMap.get(referenceType);

		if (!pointer) {
			return null;
		}

		return {
			pointer,
		};
	}

	static readonly builder = () => {
		return new DefaultDaiaReferenceRequirementResolverBuilder();
	};
}

export class DefaultDaiaReferenceRequirementResolverBuilder {
	private readonly referenceMap: Map<string, DaiaRemoteAgreementPointer> = new Map();

	addReference(referenceType: string, pointer: DaiaRemoteAgreementPointer): this {
		this.referenceMap.set(referenceType, pointer);
		return this;
	}

	build(): DefaultDaiaReferenceRequirementResolver {
		return new DefaultDaiaReferenceRequirementResolver(this.referenceMap);
	}
}
