import { DaiaRemoteAgreementPointer } from "../../../defines";
import {
	DaiaReferenceRequirementResolution,
	DaiaReferenceRequirementResolver,
} from "./referenceResolver";

/**
 * ReferenceRequirementResolver, which lets you manually specifiy pointers to agreements that are considered
 * to be valid agreements when checking an offer.
 */
export class MapDaiaReferenceRequirementResolver implements DaiaReferenceRequirementResolver {
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
		return new MapDaiaReferenceRequirementResolverBuilder();
	};
}

/**
 * Builder for MapDaiaReferenceRequirementResolver.
 * @see MapDaiaReferenceRequirementResolver
 */
export class MapDaiaReferenceRequirementResolverBuilder {
	private readonly referenceMap: Map<string, DaiaRemoteAgreementPointer> = new Map();

	addReference(referenceType: string, pointer: DaiaRemoteAgreementPointer): this {
		this.referenceMap.set(referenceType, pointer);
		return this;
	}

	build(): MapDaiaReferenceRequirementResolver {
		return new MapDaiaReferenceRequirementResolver(this.referenceMap);
	}
}
