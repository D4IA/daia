import { OfferAgreementReferencer } from "../defines";

/**
 * Agreement referencer that resolves reference URLs from a static map keyed by agreement type.
 */
export class MapOfferAgreementReferencer implements OfferAgreementReferencer {
	constructor(private readonly mapping: Record<string, string | undefined>) {}

	public readonly getAgreementReferenceUrlForType = async (
		agreementType: string,
	): Promise<string> => {
		return this.mapping[agreementType] ?? "";
	};
}
