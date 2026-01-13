import { describe, it } from "vitest";
import { DaiaHelloSchema } from "../hello";
import { DaiaMessageType } from "../common";

describe("DaiaHelloSchema", () => {
	it("should validate DAIA hello message", () => {
		DaiaHelloSchema.parse({
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: "test-public-key",
		});
	});

	it("should validate hello with long public key", () => {
		DaiaHelloSchema.parse({
			type: DaiaMessageType.DAIA_HELLO,
			publicKey:
				"04a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
		});
	});

	it("should validate hello with compressed public key format", () => {
		DaiaHelloSchema.parse({
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: "02a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
		});
	});

	it("should validate hello with empty public key", () => {
		DaiaHelloSchema.parse({
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: "",
		});
	});
});
