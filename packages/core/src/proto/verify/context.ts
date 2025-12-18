import { TransactionLoader } from "../blockchain";
import {
	DaiaTransactionData,
	DaiaTransactionDataSchema,
	DaiaTransactionDataType,
} from "../blockchain/data";
import {
	DaiaAgreement,
	DaiaAgreementSchema,
	DaiaOfferContent,
	DaiaOfferContentSchema,
} from "../defines";
import {
	AgreementVerifyError,
	AgreementVerifyErrorType,
	AgreementVerifyQuery,
	AgreementVerifyQueryType,
} from "./defines";

const EMPTY_AGREEMENT: DaiaAgreement = {
	offerContentSerialized: "",
	proofs: new Map(),
};

const parseOfferContent = (serialized: string): DaiaOfferContent | null => {
	try {
		const parsed = JSON.parse(serialized);
		if (parsed?.requirements) {
			parsed.requirements = new Map(Object.entries(parsed.requirements));
		}
		const safe = DaiaOfferContentSchema.safeParse(parsed);
		return safe.success ? safe.data : null;
	} catch {
		return null;
	}
};

export class AgreementVerificationContext {
	public readonly agreement: DaiaAgreement;
	public readonly offerContent: DaiaOfferContent | null;
	public readonly payments: Record<string, number>;
	public readonly errors: AgreementVerifyError[];

	private constructor(params: {
		agreement: DaiaAgreement;
		offerContent: DaiaOfferContent | null;
		payments: Record<string, number>;
		errors: AgreementVerifyError[];
	}) {
		this.agreement = params.agreement;
		this.offerContent = params.offerContent;
		this.payments = params.payments;
		this.errors = params.errors;
	}

	public static async fromQuery(
		loader: TransactionLoader,
		query: AgreementVerifyQuery,
	): Promise<AgreementVerificationContext> {
		const errors: AgreementVerifyError[] = [];
		let data: DaiaTransactionData | null = null;
		let payments: Record<string, number> = {};

		if (query.type === AgreementVerifyQueryType.PARSED_TRANSACTION) {
			const parsed = DaiaTransactionDataSchema.safeParse(query.transaction);
			if (parsed.success) {
				data = parsed.data;
			} else {
				errors.push({
					type: AgreementVerifyErrorType.SCHEMA_INVALID,
					message: "Invalid parsed transaction data provided",
				});
			}
		}

		if (query.type === AgreementVerifyQueryType.RAW_TRANSACTION) {
			const parsed = await loader.parse(query.transaction);
			data = parsed.data;
			payments = parsed.payments;
		}

		if (query.type === AgreementVerifyQueryType.TRANSACTION_ID) {
			const parsed = await loader.fetchById(query.id);
			if (parsed) {
				data = parsed.data;
				payments = parsed.payments;
			} else {
				errors.push({
					type: AgreementVerifyErrorType.FETCH_FAILED,
					message: `Transaction ${query.id} not found`,
				});
			}
		}

		if (query.type === AgreementVerifyQueryType.URL) {
			const parsed = await loader.fetchByUrl(query.url);
			if (parsed) {
				data = parsed.data;
				payments = parsed.payments;
			} else {
				errors.push({
					type: AgreementVerifyErrorType.FETCH_FAILED,
					message: `Transaction at ${query.url} not found`,
				});
			}
		}

		let agreement: DaiaAgreement | null =
			data?.type === DaiaTransactionDataType.AGREEMENT ? data.agreement : null;

		if (agreement) {
			const validatedAgreement = DaiaAgreementSchema.safeParse(agreement);
			if (!validatedAgreement.success) {
				errors.push({
					type: AgreementVerifyErrorType.SCHEMA_INVALID,
					message: "Agreement schema validation failed",
				});
				agreement = null;
			} else {
				agreement = validatedAgreement.data;
			}
		}

		const parsedOffer = agreement ? parseOfferContent(agreement.offerContentSerialized) : null;
		if (agreement && !parsedOffer) {
			errors.push({
				type: AgreementVerifyErrorType.SCHEMA_INVALID,
				message: "Failed to parse offerContentSerialized",
			});
		}

		return new AgreementVerificationContext({
			agreement: agreement ?? EMPTY_AGREEMENT,
			offerContent: parsedOffer,
			payments,
			errors,
		});
	}
}
