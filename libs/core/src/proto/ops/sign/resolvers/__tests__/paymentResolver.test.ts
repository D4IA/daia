import { describe, it, expect } from "vitest";
import { DaiaPaymentRequirementResolutionType } from "../paymentResolver";

describe("DaiaPaymentRequirementResolver", () => {
	it("should create self-authenticated resolution type", () => {
		const type = DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED;
		expect(type).toBeDefined();
	});

	it("should create remote tx resolution type", () => {
		const type = DaiaPaymentRequirementResolutionType.REMOTE_TX;
		expect(type).toBeDefined();
	});
});
