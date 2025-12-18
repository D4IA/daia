export class UnsatisfiedOfferRequirementsError extends Error {
	public readonly unsatisfiedRequirementIds: string[];
	public readonly paymentsLeft: Record<string, number>;

	constructor(params: {
		unsatisfiedRequirementIds: string[];
		paymentsLeft: Record<string, number>;
	}) {
		super("Offer requirements not satisfied");
		this.name = "UnsatisfiedOfferRequirementsError";
		this.unsatisfiedRequirementIds = params.unsatisfiedRequirementIds;
		this.paymentsLeft = params.paymentsLeft;
	}
}
