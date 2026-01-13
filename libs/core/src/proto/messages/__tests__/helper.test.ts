import { describe, it } from "vitest";
import { DaiaMessageUtil } from "../helper";
import { DaiaMessageType } from "../common";
import { DaiaAgreementReferenceResult } from "../agreementReference";
import { DaiaMessage } from "..";

describe("DaiaMessageUtil", () => {
	it("should check if message is a DAIA message with valid prefix", () => {
		const msg = '@@##__DAIA-MSG__##@@{"type":"test"}';
		DaiaMessageUtil.isDaiaMessage(msg);
	});

	it("should check if message is not a DAIA message without prefix", () => {
		const msg = '{"type":"test"}';
		DaiaMessageUtil.isDaiaMessage(msg);
	});

	it("should serialize a DAIA hello message", () => {
		const message: DaiaMessage = {
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: "test-public-key",
		};
		DaiaMessageUtil.serialize(message);
	});

	it("should serialize a DAIA offer message", () => {
		const message: DaiaMessage = {
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "test-offer",
					naturalLanguageOfferContent: "Test content",
					requirements: {},
				}),
				signatures: {},
			},
		};
		DaiaMessageUtil.serialize(message);
	});

	it("should deserialize a DAIA message with prefix", () => {
		const message: DaiaMessage = {
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: "test-public-key",
		};
		const serialized = DaiaMessageUtil.serialize(message);
		DaiaMessageUtil.deserialize(serialized);
	});

	it("should deserialize a DAIA message without prefix", () => {
		const message: DaiaMessage = {
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: "test-public-key",
		};
		const raw = JSON.stringify(message);
		DaiaMessageUtil.deserialize(raw);
	});

	it("should handle serialization of offer response with accept", () => {
		const message: DaiaMessage = {
			type: DaiaMessageType.OFFER_RESPONSE,
			result: DaiaAgreementReferenceResult.ACCEPT,
			agreementReference: "test-ref",
			agreement: {
				offerContent: {
					inner: "{}",
					signatures: {},
				},
				proofs: {},
			},
		};
		DaiaMessageUtil.serialize(message);
	});

	it("should handle serialization of offer response with reject", () => {
		const message: DaiaMessage = {
			type: DaiaMessageType.OFFER_RESPONSE,
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: "Test rejection reason",
		};
		DaiaMessageUtil.serialize(message);
	});
});
