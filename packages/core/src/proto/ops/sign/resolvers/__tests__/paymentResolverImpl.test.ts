import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultDaiaPaymentRequirementResolver } from "../paymentResolverImpl";
import {
	DaiaPaymentRequirementAuthType,
	DaiaRequirementPayment,
	DaiaRequirementType,
} from "../../../../defines";
import { DaiaPaymentRequirementResolutionType } from "../paymentResolver";
import { BlockchainTransactionFactory, CreatedBlockchainTransactionHandle } from "@daia/blockchain";
import { DaiaTransactionDataType } from "../../../../blockchain";

describe("DefaultDaiaPaymentRequirementResolver", () => {
	let mockTransactionFactory: BlockchainTransactionFactory;
	let mockTransactionHandle: CreatedBlockchainTransactionHandle;

	beforeEach(() => {
		mockTransactionHandle = {
			id: "test-tx-id",
			data: {
				customData: null,
				payments: {},
			},
			serializedTransaction: vi.fn().mockReturnValue("serialized-tx"),
			publish: vi.fn().mockResolvedValue(undefined),
		};

		mockTransactionFactory = {
			makeTransaction: vi.fn().mockResolvedValue(mockTransactionHandle),
		};
	});

	describe("createPaymentProof", () => {
		it("should return self-authenticated resolution for self-authenticated payments", async () => {
			const resolver = new DefaultDaiaPaymentRequirementResolver(mockTransactionFactory);

			const requirement: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "test-address",
				amount: 1000,
				auth: {
					type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
				},
			};

			const result = await resolver.createPaymentProof(requirement);

			expect(result).toEqual({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"test-address": 1000,
				},
			});

			// Should not create a blockchain transaction for self-authenticated payments
			expect(mockTransactionFactory.makeTransaction).not.toHaveBeenCalled();
		});

		it("should create blockchain transaction for remote payments", async () => {
			const resolver = new DefaultDaiaPaymentRequirementResolver(mockTransactionFactory);

			const requirement: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "recipient-address",
				amount: 5000,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "unique-nonce-123",
				},
			};

			const result = await resolver.createPaymentProof(requirement);

			expect(result).toEqual({
				type: DaiaPaymentRequirementResolutionType.REMOTE_TX,
				handle: mockTransactionHandle,
			});

			// Verify transaction was created with correct data
			expect(mockTransactionFactory.makeTransaction).toHaveBeenCalledWith({
				payments: {
					"recipient-address": 5000,
				},
				customData: JSON.stringify({
					type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
					paymentNonce: "unique-nonce-123",
				}),
			});
		});

		it("should handle multiple self-authenticated payments", async () => {
			const resolver = new DefaultDaiaPaymentRequirementResolver(mockTransactionFactory);

			const requirement1: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "address-1",
				amount: 1000,
				auth: {
					type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
				},
			};

			const requirement2: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "address-2",
				amount: 2000,
				auth: {
					type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
				},
			};

			const result1 = await resolver.createPaymentProof(requirement1);
			const result2 = await resolver.createPaymentProof(requirement2);

			expect(result1).toEqual({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"address-1": 1000,
				},
			});

			expect(result2).toEqual({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"address-2": 2000,
				},
			});
		});

		it("should handle remote payment with different nonces", async () => {
			const resolver = new DefaultDaiaPaymentRequirementResolver(mockTransactionFactory);

			const requirement1: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "address-1",
				amount: 1000,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "nonce-1",
				},
			};

			const requirement2: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "address-2",
				amount: 2000,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "nonce-2",
				},
			};

			await resolver.createPaymentProof(requirement1);
			await resolver.createPaymentProof(requirement2);

			expect(mockTransactionFactory.makeTransaction).toHaveBeenCalledTimes(2);
			expect(mockTransactionFactory.makeTransaction).toHaveBeenNthCalledWith(1, {
				payments: { "address-1": 1000 },
				customData: JSON.stringify({
					type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
					paymentNonce: "nonce-1",
				}),
			});

			expect(mockTransactionFactory.makeTransaction).toHaveBeenNthCalledWith(2, {
				payments: { "address-2": 2000 },
				customData: JSON.stringify({
					type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
					paymentNonce: "nonce-2",
				}),
			});
		});

		it("should handle zero amount payments", async () => {
			const resolver = new DefaultDaiaPaymentRequirementResolver(mockTransactionFactory);

			const requirement: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "test-address",
				amount: 0,
				auth: {
					type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
				},
			};

			const result = await resolver.createPaymentProof(requirement);

			expect(result).toEqual({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"test-address": 0,
				},
			});
		});

		it("should properly handle transaction factory errors", async () => {
			const errorFactory: BlockchainTransactionFactory = {
				makeTransaction: vi.fn().mockRejectedValue(new Error("Transaction creation failed")),
			};

			const resolver = new DefaultDaiaPaymentRequirementResolver(errorFactory);

			const requirement: DaiaRequirementPayment = {
				type: DaiaRequirementType.PAYMENT,
				to: "recipient-address",
				amount: 5000,
				auth: {
					type: DaiaPaymentRequirementAuthType.REMOTE,
					paymentNonce: "nonce-123",
				},
			};

			await expect(resolver.createPaymentProof(requirement)).rejects.toThrow(
				"Transaction creation failed",
			);
		});
	});
});
