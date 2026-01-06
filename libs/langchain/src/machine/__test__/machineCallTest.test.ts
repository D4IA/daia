import {
	DaiaAgreementReferenceResult,
	DaiaMessage,
	DaiaMessageType,
	DaiaMessageUtil,
	DaiaOfferBuilder,
	DaiaTransferOfferContent,
} from "@d4ia/core";
import { describe, expect, test } from "vitest";
import {
	DaiaLanggraphOfferResponse,
	DaiaLanggraphState,
	DaiaLanggraphStateAccessor,
	DaiaLanggraphStateWriter,
	makeInitialDaiaLanggraphState,
} from "../../state";
import { DaiaLanggraphMachineStatus } from "../../state/innerState";
import { DaiaStateMachineConfig } from "../machine";
import { DaiaLanggraphStateMachineCall } from "../machineCall";
import { DaiaLanggraphMachineNode } from "../machineDefines";

describe("DaiaStateMachineCall", () => {
	const CONFIG_ZERO: DaiaStateMachineConfig = {
		publicKey: "PK_0",
	};

	const CONFIG_ONE: DaiaStateMachineConfig = {
		publicKey: "PK_1",
	};

	const runStateExchanges = async (
		s0: DaiaLanggraphState = makeInitialDaiaLanggraphState(),
		s1: DaiaLanggraphState = makeInitialDaiaLanggraphState(),
	): Promise<[DaiaLanggraphState, DaiaLanggraphState]> => {
		let i = 0;
		while (
			s0.inner.status !== DaiaLanggraphMachineStatus.CONVERSING ||
			s1.inner.status !== DaiaLanggraphMachineStatus.CONVERSING
		) {
			i += 1;

			const output0 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
			const outputState0Accessor = DaiaLanggraphStateAccessor.fromState(output0.newState);
			s0 = output0.newState;

			if (output0.targetNode === DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT) {
				s1 = DaiaLanggraphStateWriter.fromState(s1)
					.clear()
					.setInput(outputState0Accessor.getOutput())
					.build();
			} else if (output0.targetNode === DaiaLanggraphMachineNode.CONTINUE_CONVERSING) {
				s1 = DaiaLanggraphStateWriter.fromState(s1)
					.clear()
					.setInput("Some natural language content")
					.build();
			} else {
				throw new Error(`Unreachable in this scenario`);
			}

			const output1 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
			const outputState1Accessor = DaiaLanggraphStateAccessor.fromState(output1.newState);
			s1 = output1.newState;

			if (output1.targetNode === DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT) {
				s0 = DaiaLanggraphStateWriter.fromState(s0)
					.clear()
					.setInput(outputState1Accessor.getOutput())
					.build();
			} else if (output1.targetNode === DaiaLanggraphMachineNode.CONTINUE_CONVERSING) {
				s0 = DaiaLanggraphStateWriter.fromState(s0)
					.clear()
					.setInput("Some natural language content")
					.build();
			} else {
				throw new Error(`Unreachable in this scenario`);
			}

			expect(i).toBeLessThan(5);
		}

		return [s0, s1];
	};

	test("can send hello with empty input", async () => {
		const s1 = DaiaLanggraphStateWriter.fromState(makeInitialDaiaLanggraphState())
			.clear()
			.setInput("")
			.build();

		const call = new DaiaLanggraphStateMachineCall(s1, CONFIG_ZERO);

		const s2 = await call.run();
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).canCallMethod()).toBe(false);
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).isDaiaReady()).toBe(false);

		expect(s2.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);
		expect(
			DaiaMessageUtil.deserialize(DaiaLanggraphStateAccessor.fromState(s2.newState).getOutput()),
		).toEqual({
			type: DaiaMessageType.DAIA_HELLO,
			publicKey: CONFIG_ZERO.publicKey,
		});
	});

	test("can send hello with empty input and answer to one", async () => {
		const s0 = DaiaLanggraphStateWriter.fromState(makeInitialDaiaLanggraphState())
			.clear()
			.setInput("")
			.build();

		const remotePubKey = "asdf";

		const c1 = new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO);
		const s1 = await c1.run();
		const c2 = new DaiaLanggraphStateMachineCall(
			DaiaLanggraphStateWriter.fromState(s1.newState)
				.setInput(
					DaiaMessageUtil.serialize({
						type: DaiaMessageType.DAIA_HELLO,
						publicKey: remotePubKey,
					}),
				)
				.build(),
			CONFIG_ZERO,
		);
		const s2 = await c2.run();
		expect(s2.targetNode).toBe(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).isDaiaReady()).toBe(true);
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).remotePublicKey()).toBe(remotePubKey);
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).canCallMethod()).toBe(true);
	});

	test("can send hello with empty input and answer to one", async () => {
		const s0 = DaiaLanggraphStateWriter.fromState(makeInitialDaiaLanggraphState())
			.clear()
			.setInput("")
			.build();

		const remotePubKey = "asdf";

		const c1 = new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO);
		const s1 = await c1.run();
		const c2 = new DaiaLanggraphStateMachineCall(
			DaiaLanggraphStateWriter.fromState(s1.newState)
				.setInput(
					DaiaMessageUtil.serialize({
						type: DaiaMessageType.DAIA_HELLO,
						publicKey: remotePubKey,
					}),
				)
				.build(),
			CONFIG_ZERO,
		);
		const s2 = await c2.run();
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).isDaiaReady()).toBe(true);
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).remotePublicKey()).toBe(remotePubKey);
		expect(DaiaLanggraphStateAccessor.fromState(s2.newState).canCallMethod()).toBe(true);
	});

	test("can exchange hellos and converse with remote party for a while", async () => {
		let s0 = DaiaLanggraphStateWriter.fromState(makeInitialDaiaLanggraphState())
			.clear()
			.setInput("")
			.build();

		let s1 = DaiaLanggraphStateWriter.fromState(makeInitialDaiaLanggraphState())
			.clear()
			.setInput("")
			.build();

		let s0DaiaMessages = 0;
		let s1DaiaMessages = 0;
		let s0NaturalMessages = 0;
		let s1NaturalMessages = 0;

		for (let i = 0; i < 20; i++) {
			const output0 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
			const outputState0Accessor = DaiaLanggraphStateAccessor.fromState(output0.newState);
			s0 = output0.newState;

			if (output0.targetNode === DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT) {
				s0DaiaMessages += 1;
				s1 = DaiaLanggraphStateWriter.fromState(s1)
					.clear()
					.setInput(outputState0Accessor.getOutput())
					.build();
			} else if (output0.targetNode === DaiaLanggraphMachineNode.CONTINUE_CONVERSING) {
				s0NaturalMessages += 1;
				s1 = DaiaLanggraphStateWriter.fromState(s1)
					.clear()
					.setInput("Some natural language content")
					.build();
			} else {
				throw new Error(`Unreachable in this scenario`);
			}

			const output1 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
			const outputState1Accessor = DaiaLanggraphStateAccessor.fromState(output1.newState);
			s1 = output1.newState;

			if (output1.targetNode === DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT) {
				s1DaiaMessages += 1;
				s0 = DaiaLanggraphStateWriter.fromState(s0)
					.clear()
					.setInput(outputState1Accessor.getOutput())
					.build();
			} else if (output1.targetNode === DaiaLanggraphMachineNode.CONTINUE_CONVERSING) {
				s1NaturalMessages += 1;
				s0 = DaiaLanggraphStateWriter.fromState(s0)
					.clear()
					.setInput("Some natural language content")
					.build();
			} else {
				throw new Error(`Unreachable in this scenario`);
			}
		}

		expect(s0DaiaMessages).toBe(1);
		expect(s1DaiaMessages).toBe(1);
		expect(s0NaturalMessages).toBeGreaterThan(10);
		expect(s1NaturalMessages).toBeGreaterThan(10);
	});

	test("can send offer during conversation", async () => {
		let [s0, s1] = await runStateExchanges();

		const o1: DaiaTransferOfferContent = DaiaOfferBuilder.new()
			.setNaturalLanguageContent("Some offer content")
			.setOfferTypeIdentifier("DAIA-TEST-OFFER")
			.build();

		s0 = DaiaLanggraphStateWriter.fromState(s0).proposeOffer(o1).build();
		const c0 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		s0 = c0.newState;
		const s0Accessor = DaiaLanggraphStateAccessor.fromState(s0);
		expect(c0.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);

		expect(DaiaMessageUtil.deserialize(s0Accessor.getOutput())).toEqual({
			type: DaiaMessageType.OFFER,
			content: o1,
		} satisfies DaiaMessage);

		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput(s0Accessor.getOutput()).build();
		const c1 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		s1 = c1.newState;

		expect(c1.targetNode).toEqual(DaiaLanggraphMachineNode.OFFER_RECEIVED);
		const s1Accessor = DaiaLanggraphStateAccessor.fromState(s1);
		expect(s1Accessor.getOffer()).toEqual(o1);

		const r0: DaiaLanggraphOfferResponse = {
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: "asdf",
		};

		s1 = DaiaLanggraphStateWriter.fromState(s1).setOfferResponse(r0).build();

		const c1_2 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		const c1_2Accessor = DaiaLanggraphStateAccessor.fromState(c1_2.newState);
		s1 = c1_2.newState;
		expect(c1_2.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);
		expect(DaiaMessageUtil.deserialize(c1_2Accessor.getOutput())).toEqual({
			type: DaiaMessageType.OFFER_RESPONSE,
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: r0.rationale,
		} satisfies DaiaMessage);

		s0 = DaiaLanggraphStateWriter.fromState(s0).setInput(c1_2Accessor.getOutput()).build();
		const c0_2 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		const c0_2Accessor = DaiaLanggraphStateAccessor.fromState(c0_2.newState);
		s0 = c0_2.newState;
		expect(c0_2.targetNode).toEqual(DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER);
		expect(c0_2Accessor.getOfferResponse()).toEqual(r0);
		expect(c0_2Accessor.getOffer()).toBeNull();
		expect(c0_2.newState.input.methodCall).toBeNull();

		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput("Some natural language content").build();
		const c1_3 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		const c1_3Accessor = DaiaLanggraphStateAccessor.fromState(c1_3.newState);
		expect(c1_3.targetNode).toEqual(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(c1_3Accessor.getOffer()).toBeNull();
		expect(c1_3Accessor.getOfferResponse()).toBeNull();

		s0 = DaiaLanggraphStateWriter.fromState(s0).setInput("Some natural language content").build();
		const c0_3 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		const c0_3Accessor = DaiaLanggraphStateAccessor.fromState(c0_3.newState);
		expect(c0_3.targetNode).toEqual(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(c0_3Accessor.getOfferResponse()).toBeNull();
		expect(c0_3Accessor.getOffer()).toBeNull();
	});

	test("should throw if offer received but no response provided", async () => {
		let [s0, s1] = await runStateExchanges();

		// s0 sends an offer
		const o1: DaiaTransferOfferContent = DaiaOfferBuilder.new()
			.setNaturalLanguageContent("Some offer content")
			.setOfferTypeIdentifier("DAIA-TEST-OFFER")
			.build();

		s0 = DaiaLanggraphStateWriter.fromState(s0).proposeOffer(o1).build();
		const c0 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		s0 = c0.newState;
		const s0Accessor = DaiaLanggraphStateAccessor.fromState(s0);
		expect(c0.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);

		// s1 receives the offer
		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput(s0Accessor.getOutput()).build();
		const c1 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		s1 = c1.newState;
		expect(c1.targetNode).toEqual(DaiaLanggraphMachineNode.OFFER_RECEIVED);

		// s1 tries to continue without providing an offer response - should throw
		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput("Some natural language content").build();
		await expect(async () => {
			await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		}).rejects.toThrow();
	});

	test("should throw if offer received and agent tries to send another offer without responding", async () => {
		let [s0, s1] = await runStateExchanges();

		// s0 sends an offer
		const o1: DaiaTransferOfferContent = DaiaOfferBuilder.new()
			.setNaturalLanguageContent("First offer content")
			.setOfferTypeIdentifier("DAIA-TEST-OFFER-1")
			.build();

		s0 = DaiaLanggraphStateWriter.fromState(s0).proposeOffer(o1).build();
		const c0 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		s0 = c0.newState;
		const s0Accessor = DaiaLanggraphStateAccessor.fromState(s0);
		expect(c0.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);

		// s1 receives the offer
		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput(s0Accessor.getOutput()).build();
		const c1 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		s1 = c1.newState;
		expect(c1.targetNode).toEqual(DaiaLanggraphMachineNode.OFFER_RECEIVED);

		// s1 tries to send another offer instead of responding - should throw
		const o2: DaiaTransferOfferContent = DaiaOfferBuilder.new()
			.setNaturalLanguageContent("Counter offer content")
			.setOfferTypeIdentifier("DAIA-TEST-OFFER-2")
			.build();

		s1 = DaiaLanggraphStateWriter.fromState(s1).proposeOffer(o2).build();
		await expect(async () => {
			await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		}).rejects.toThrow();
	});

	test("can continue conversation after offer is accepted", async () => {
		let [s0, s1] = await runStateExchanges();

		// s0 sends an offer
		const o1: DaiaTransferOfferContent = DaiaOfferBuilder.new()
			.setNaturalLanguageContent("Some offer content")
			.setOfferTypeIdentifier("DAIA-TEST-OFFER")
			.build();

		s0 = DaiaLanggraphStateWriter.fromState(s0).proposeOffer(o1).build();
		const c0 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		s0 = c0.newState;
		const s0Accessor = DaiaLanggraphStateAccessor.fromState(s0);
		expect(c0.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);

		// s1 receives the offer
		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput(s0Accessor.getOutput()).build();
		const c1 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		s1 = c1.newState;
		expect(c1.targetNode).toEqual(DaiaLanggraphMachineNode.OFFER_RECEIVED);

		// s1 accepts the offer
		const acceptanceResponse: DaiaLanggraphOfferResponse = {
			result: DaiaAgreementReferenceResult.ACCEPT,
			agreementReference: "agreement-ref-123",
			agreement: {
				offerContent: o1,
				proofs: {},
			},
		};

		s1 = DaiaLanggraphStateWriter.fromState(s1).setOfferResponse(acceptanceResponse).build();

		const c1_2 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		const c1_2Accessor = DaiaLanggraphStateAccessor.fromState(c1_2.newState);
		s1 = c1_2.newState;
		expect(c1_2.targetNode).toEqual(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT);
		expect(DaiaMessageUtil.deserialize(c1_2Accessor.getOutput())).toEqual({
			type: DaiaMessageType.OFFER_RESPONSE,
			result: DaiaAgreementReferenceResult.ACCEPT,
			agreementReference: acceptanceResponse.agreementReference,
			agreement: acceptanceResponse.agreement,
		} satisfies DaiaMessage);

		// s0 receives the acceptance
		s0 = DaiaLanggraphStateWriter.fromState(s0).setInput(c1_2Accessor.getOutput()).build();
		const c0_2 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		const c0_2Accessor = DaiaLanggraphStateAccessor.fromState(c0_2.newState);
		s0 = c0_2.newState;
		expect(c0_2.targetNode).toEqual(DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER);
		expect(c0_2Accessor.getOfferResponse()).toEqual(acceptanceResponse);
		expect(c0_2Accessor.getOffer()).toBeNull();
		expect(c0_2.newState.input.methodCall).toBeNull();

		// First round of conversation after acceptance - s1 sends message
		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput("First message after acceptance").build();
		const c1_3 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		const c1_3Accessor = DaiaLanggraphStateAccessor.fromState(c1_3.newState);
		s1 = c1_3.newState;
		expect(c1_3.targetNode).toEqual(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(c1_3Accessor.getOffer()).toBeNull();
		expect(c1_3Accessor.getOfferResponse()).toBeNull();

		// First round - s0 responds
		s0 = DaiaLanggraphStateWriter.fromState(s0).setInput("Response to first message").build();
		const c0_3 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		const c0_3Accessor = DaiaLanggraphStateAccessor.fromState(c0_3.newState);
		s0 = c0_3.newState;
		expect(c0_3.targetNode).toEqual(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(c0_3Accessor.getOfferResponse()).toBeNull();
		expect(c0_3Accessor.getOffer()).toBeNull();

		// Second round of conversation - s1 sends another message
		s1 = DaiaLanggraphStateWriter.fromState(s1).setInput("Second message after acceptance").build();
		const c1_4 = await new DaiaLanggraphStateMachineCall(s1, CONFIG_ONE).run();
		const c1_4Accessor = DaiaLanggraphStateAccessor.fromState(c1_4.newState);
		s1 = c1_4.newState;
		expect(c1_4.targetNode).toEqual(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(c1_4Accessor.getOffer()).toBeNull();
		expect(c1_4Accessor.getOfferResponse()).toBeNull();

		// Second round - s0 responds
		s0 = DaiaLanggraphStateWriter.fromState(s0).setInput("Response to second message").build();
		const c0_4 = await new DaiaLanggraphStateMachineCall(s0, CONFIG_ZERO).run();
		const c0_4Accessor = DaiaLanggraphStateAccessor.fromState(c0_4.newState);
		s0 = c0_4.newState;
		expect(c0_4.targetNode).toEqual(DaiaLanggraphMachineNode.CONTINUE_CONVERSING);
		expect(c0_4Accessor.getOfferResponse()).toBeNull();
		expect(c0_4Accessor.getOffer()).toBeNull();
	});
});
