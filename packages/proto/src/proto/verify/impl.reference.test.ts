import { describe, expect, test } from "vitest";
import { AgreementVerifierImpl } from "./impl";
import { AgreementVerifyQueryType, AgreementVerifyErrorType } from "./defines";
import { TransactionLoader } from "../blockchain";
import { DaiaRequirementType } from "../defines";
import { DaiaTransactionData, DaiaTransactionDataType } from "../blockchain/data";

const makeSelfReferencingAgreement = (ref: string): DaiaTransactionData => {
	const offerContentSerialized = JSON.stringify({
		offerTypeIdentifier: "t",
		naturalLanguageOfferContent: "n",
		requirements: {
			ref: {
				type: DaiaRequirementType.AGREEMENT_REFERENCE,
				referenceType: "rt",
				url: null,
			},
		},
	});

	return {
		type: DaiaTransactionDataType.AGREEMENT,
		agreement: {
			offerContentSerialized,
			proofs: new Map([["ref", { type: DaiaRequirementType.AGREEMENT_REFERENCE, reference: ref }]]),
		},
	};
};

describe("AgreementVerifierImpl agreement-reference recursion", () => {
	test("detects self-referencing agreement and stops", async () => {
		const ref = "bsv://self";
		const data = makeSelfReferencingAgreement(ref);

		const loader = new TransactionLoader(
			{
				parseTransaction: async (tx) => ({
					data: tx === "raw" ? data : null,
					payments: {},
				}),
			},
			{
				fetchTransactionById: async () => "raw",
				fetchTransactionByUrl: async () => "raw",
			},
		);

		const verifier = new AgreementVerifierImpl(loader);
		const result = await verifier.verifyAgreement({
			type: AgreementVerifyQueryType.URL,
			url: ref,
		});

		expect(result.requirementsNotSatisfied.has("ref")).toBe(true);
		expect(
			result.errors.find((e) => e.type === AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED)?.message,
		).toContain("recursion");
	});

	test("detects recursion across a chain of three references", async () => {
		const refA = "bsv://a";
		const refB = "bsv://b";
		const refC = "bsv://c";

		const agreementA = makeSelfReferencingAgreement(refB);
		const agreementB = makeSelfReferencingAgreement(refC);
		const agreementC = makeSelfReferencingAgreement(refA); // closes the cycle

		const loader = new TransactionLoader(
			{
				parseTransaction: async (tx) => {
					switch (tx) {
						case "raw-a":
							return { data: agreementA, payments: {} };
						case "raw-b":
							return { data: agreementB, payments: {} };
						case "raw-c":
							return { data: agreementC, payments: {} };
						default:
							return { data: null, payments: {} };
					}
				},
			},
			{
				fetchTransactionById: async (id) => {
					if (id === "a") return "raw-a";
					if (id === "b") return "raw-b";
					if (id === "c") return "raw-c";
					return null;
				},
				fetchTransactionByUrl: async (url) => {
					if (url === refA) return "raw-a";
					if (url === refB) return "raw-b";
					if (url === refC) return "raw-c";
					return null;
				},
			},
		);

		const verifier = new AgreementVerifierImpl(loader);
		const result = await verifier.verifyAgreement({
			type: AgreementVerifyQueryType.URL,
			url: refA,
		});

		expect(result.requirementsNotSatisfied.has("ref")).toBe(true);
		const recursionError = result.errors.find(
			(e) => e.type === AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED,
		);
		expect(recursionError?.message).toContain("recursion");
	});
});
