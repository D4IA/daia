import { describe, it, expect, beforeEach } from "vitest";
import {
	DefaultDaiaReferenceRequirementResolver,
	DefaultDaiaReferenceRequirementResolverBuilder,
} from "../referenceResolverImpl";
import { DaiaRemoteAgreementPointer, DaiaRemoteAgreementPointerType } from "../../../../defines";

describe("DefaultDaiaReferenceRequirementResolver", () => {
	let testPointer1: DaiaRemoteAgreementPointer;
	let testPointer2: DaiaRemoteAgreementPointer;

	beforeEach(() => {
		testPointer1 = {
			type: DaiaRemoteAgreementPointerType.TX_ID,
			txId: "test-tx-id-1",
		};

		testPointer2 = {
			type: DaiaRemoteAgreementPointerType.TX_ID,
			txId: "test-tx-id-2",
		};
	});

	describe("createSignatureProof", () => {
		it("should return pointer for existing reference type", async () => {
			const referenceMap = new Map<string, DaiaRemoteAgreementPointer>();
			referenceMap.set("referenceType1", testPointer1);

			const resolver = new DefaultDaiaReferenceRequirementResolver(referenceMap);

			const result = await resolver.createSignatureProof("referenceType1");

			expect(result).not.toBeNull();
			expect(result!.pointer).toEqual(testPointer1);
		});

		it("should return null for non-existing reference type", async () => {
			const referenceMap = new Map<string, DaiaRemoteAgreementPointer>();
			referenceMap.set("referenceType1", testPointer1);

			const resolver = new DefaultDaiaReferenceRequirementResolver(referenceMap);

			const result = await resolver.createSignatureProof("nonExistentType");

			expect(result).toBeNull();
		});

		it("should handle multiple reference types correctly", async () => {
			const referenceMap = new Map<string, DaiaRemoteAgreementPointer>();
			referenceMap.set("type1", testPointer1);
			referenceMap.set("type2", testPointer2);

			const resolver = new DefaultDaiaReferenceRequirementResolver(referenceMap);

			const result1 = await resolver.createSignatureProof("type1");
			const result2 = await resolver.createSignatureProof("type2");

			expect(result1).not.toBeNull();
			expect(result1!.pointer).toEqual(testPointer1);

			expect(result2).not.toBeNull();
			expect(result2!.pointer).toEqual(testPointer2);
		});

		it("should handle empty reference map", async () => {
			const referenceMap = new Map<string, DaiaRemoteAgreementPointer>();
			const resolver = new DefaultDaiaReferenceRequirementResolver(referenceMap);

			const result = await resolver.createSignatureProof("anyType");

			expect(result).toBeNull();
		});

		it("should handle empty string reference type", async () => {
			const referenceMap = new Map<string, DaiaRemoteAgreementPointer>();
			referenceMap.set("", testPointer1);

			const resolver = new DefaultDaiaReferenceRequirementResolver(referenceMap);

			const result = await resolver.createSignatureProof("");

			expect(result).not.toBeNull();
			expect(result!.pointer).toEqual(testPointer1);
		});
	});

	describe("builder", () => {
		it("should create builder instance", () => {
			const builder = DefaultDaiaReferenceRequirementResolver.builder();

			expect(builder).toBeInstanceOf(DefaultDaiaReferenceRequirementResolverBuilder);
		});

		it("should build resolver with single reference", () => {
			const resolver = DefaultDaiaReferenceRequirementResolver.builder()
				.addReference("type1", testPointer1)
				.build();

			expect(resolver).toBeInstanceOf(DefaultDaiaReferenceRequirementResolver);
		});

		it("should allow method chaining", () => {
			const builder = DefaultDaiaReferenceRequirementResolver.builder()
				.addReference("type1", testPointer1)
				.addReference("type2", testPointer2);

			expect(builder).toBeInstanceOf(DefaultDaiaReferenceRequirementResolverBuilder);
		});

		it("should build resolver that resolves added references correctly", async () => {
			const resolver = DefaultDaiaReferenceRequirementResolver.builder()
				.addReference("type1", testPointer1)
				.addReference("type2", testPointer2)
				.build();

			const result1 = await resolver.createSignatureProof("type1");
			const result2 = await resolver.createSignatureProof("type2");
			const result3 = await resolver.createSignatureProof("type3");

			expect(result1).not.toBeNull();
			expect(result1!.pointer).toEqual(testPointer1);

			expect(result2).not.toBeNull();
			expect(result2!.pointer).toEqual(testPointer2);

			expect(result3).toBeNull();
		});

		it("should build empty resolver when no references added", async () => {
			const resolver = DefaultDaiaReferenceRequirementResolver.builder().build();

			const result = await resolver.createSignatureProof("anyType");

			expect(result).toBeNull();
		});

		it("should override reference when same type is added twice", async () => {
			const updatedPointer: DaiaRemoteAgreementPointer = {
				type: DaiaRemoteAgreementPointerType.TX_ID,
				txId: "updated-tx-id",
			};

			const resolver = DefaultDaiaReferenceRequirementResolver.builder()
				.addReference("type1", testPointer1)
				.addReference("type1", updatedPointer)
				.build();

			const result = await resolver.createSignatureProof("type1");

			expect(result).not.toBeNull();
			expect(result!.pointer).toEqual(updatedPointer);
			expect(result!.pointer.txId).toBe("updated-tx-id");
		});

		it("should handle multiple builders independently", async () => {
			const builder1 = DefaultDaiaReferenceRequirementResolver.builder().addReference(
				"type1",
				testPointer1,
			);

			const builder2 = DefaultDaiaReferenceRequirementResolver.builder().addReference(
				"type2",
				testPointer2,
			);

			const resolver1 = builder1.build();
			const resolver2 = builder2.build();

			const result1 = await resolver1.createSignatureProof("type1");
			const result2 = await resolver1.createSignatureProof("type2");
			const result3 = await resolver2.createSignatureProof("type1");
			const result4 = await resolver2.createSignatureProof("type2");

			expect(result1).not.toBeNull();
			expect(result2).toBeNull();
			expect(result3).toBeNull();
			expect(result4).not.toBeNull();
		});
	});
});
