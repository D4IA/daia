import { describe, expect, test } from "vitest";
import { KeysetOfferSigner, SecretKey, MapOfferAgreementReferencer } from "../../sign";

describe("KeysetOfferSigner", () => {
	const signedByA = "sig-a";
	const keys: SecretKey[] = [
		{
			publicKey: "pub-a",
			sign: async (data) => `${signedByA}:${data}`,
		},
		{
			publicKey: "pub-b",
			sign: async (data) => `sig-b:${data}`,
		},
	];

	test("signs when key exists", async () => {
		const signer = new KeysetOfferSigner(keys);
		const message = "payload";

		const signature = await signer.signForPublicKey("pub-a", message);

		expect(signature).toBe(`${signedByA}:${message}`);
	});

	test("throws when key missing", async () => {
		const signer = new KeysetOfferSigner(keys);

		await expect(signer.signForPublicKey("missing", "data")).rejects.toThrow(
			/No secret key available/,
		);
	});
});

describe("MapOfferAgreementReferencer", () => {
	test("returns mapped URL", async () => {
		const referencer = new MapOfferAgreementReferencer({ typeA: "bsv://txid" });

		const url = await referencer.getAgreementReferenceUrlForType("typeA");

		expect(url).toBe("bsv://txid");
	});

	test("returns empty string when missing", async () => {
		const referencer = new MapOfferAgreementReferencer({});

		const url = await referencer.getAgreementReferenceUrlForType("unknown");

		expect(url).toBe("");
	});
});
