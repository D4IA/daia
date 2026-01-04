import {
	DaiaAgreementReferenceResult,
	DaiaAgreementVerificationResult,
	DaiaOfferBuilder,
} from "@d4ia/core";
import {
	DaiaLanggraphMachineNode,
	DaiaLanggraphMethodId,
	DaiaLanggraphStateAccessor,
	DaiaLanggraphStateWriter,
	makeDaiaGraph,
} from "@d4ia/langchain";
import { Command, END, START, StateGraph } from "@langchain/langgraph";
import { produce } from "immer";
import z from "zod/v3";
import { GateAgentEnterAdapter } from "./adapter";
import { convertGateEnterOfferToString, GateEnterAgentStateSchema } from "./state";
import { ENTER_OFFER_TYPE_IDENTIFIER } from "../../common";
import { sleep } from "../../util";

export function createGateAgentGraph(adapter: GateAgentEnterAdapter) {
	const daiaSubgraph = makeDaiaGraph<z.infer<typeof GateEnterAgentStateSchema>>({
		publicKey: adapter.getPublicKey().toString(),
		mapNode: (node) => "D_" + node,
	});

	const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT;
	const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING;
	const afterRemoteProcessedLocalOffer = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER;
	const afterOfferReceived = "D_" + DaiaLanggraphMachineNode.OFFER_RECEIVED;

	const graph = new StateGraph(GateEnterAgentStateSchema)
		.addNode("handleInputs", async (state) => {
			const writer = DaiaLanggraphStateWriter.fromState(state.daia);

			return {
				daia: writer.setInput(state.input).build(),
			};
		})
		.addNode(
			"daiaSubgraph",
			async (state) => {
				const result = await daiaSubgraph.invoke(state);
				return result;
			},
			{
				ends: [
					sendDaiaOutput,
					continueConversation,
					afterRemoteProcessedLocalOffer,
					afterOfferReceived,
				],
			},
		)
		.addNode(afterOfferReceived, async (state) => {
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
			return produce(state, (draft) => {
				draft.output = {
					type: "response",
					response: accessor.getOutput(),
				};
				draft.daia = DaiaLanggraphStateWriter.fromState(state.daia)
					.setOfferResponse({
						result: DaiaAgreementReferenceResult.REJECT,
						rationale: "This agent does not accept offers",
					})
					.build();
			});
		})
		.addNode(afterRemoteProcessedLocalOffer, async (state) => {
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
			const response = accessor.getOfferResponse();

			if (!response) throw new Error("Unreachable; Offer response must be present at this point");

			if (response.result === DaiaAgreementReferenceResult.ACCEPT) {
				const agreementReference = response.agreementReference;

				// Retry logic: 5 attempts with 5 second delays
				let verificationResult = undefined;
				for (let attempt = 1; attempt <= 5; attempt++) {
					adapter.log("Fetching transaction, attempt " + attempt);
					verificationResult = await adapter
						.getVerifier()
						.getAgreementFromTransaction(agreementReference);
					if (
						verificationResult.found &&
						verificationResult.verification.result === DaiaAgreementVerificationResult.PASSED
					) {
						break; // Success, exit retry loop
					}

					// If not found, wait and retry
					if (!verificationResult.found && attempt < 5) {
						await sleep(5000)
					}
				}

				if (
					!verificationResult ||
					!verificationResult.found ||
					verificationResult.verification.result !== DaiaAgreementVerificationResult.PASSED
				) {
					await adapter.finalizeCar("reject");
					return produce(state, (draft) => {
						draft.output = {
							type: "reject-client",
						};
					});
				}

				// TODO(teawithsand): handle proofs mismatches here as well

				if (verificationResult.agreement.offerContent !== verificationResult.agreement.offerContent) {
					await adapter.finalizeCar("reject");
					return produce(state, (draft) => {
						draft.output = {
							type: "reject-client",
						};
					});
				}

				// Register new client in the database
				adapter.getCarsDB().add({
					licensePlate: await adapter.readLicensePlate(),
					parkedAt: new Date(),
					publicKey: accessor.remotePublicKey()?.toString() ?? "",
					ratePerHour: state.lastOffer!.ratePerHour,
					parkingTransactionId: agreementReference,
				});

				await adapter.finalizeCar("let-in");
				return produce(state, (draft) => {
					draft.output = {
						type: "accept-client",
					};
				});
			} else if (response.result === DaiaAgreementReferenceResult.REJECT) {
				const responseText = await adapter.runConversationTextOnly(
					state.conversationHistory,
					"Offer was rejected: " + (response.rationale ?? "no rationale provided"),
				);

				return produce(state, (draft) => {
					draft.output = {
						type: "response",
						response: responseText,
					};
					draft.conversationHistory.push(
						{
							role: "user" as const,
							content: "Offer was rejected: " + (response.rationale ?? "no rationale provided"),
						},
						{ role: "assistant" as const, content: responseText },
					);
				});
			} else {
				throw new Error("Unreachable; Unknown DaiaAgreementReferenceResult");
			}
			return state;
		})
		.addNode(sendDaiaOutput, async (state) => {
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
			return produce(state, (draft) => {
				draft.output = {
					type: "response",
					response: accessor.getOutput(),
				};
			});
		})
		.addNode(continueConversation, async (state) => {
			const input = DaiaLanggraphStateAccessor.fromNamespacedState(state).getInput();

			const assistantResponse = await adapter.runConversation(state.conversationHistory, input);

			if (assistantResponse.type === "text") {
				return produce(state, (draft) => {
					draft.output = {
						type: "response",
						response: assistantResponse.text,
					};
					draft.conversationHistory.push(
						{ role: "user" as const, content: input },
						{ role: "assistant" as const, content: assistantResponse.text },
					);
				});
			}

			if (assistantResponse.type === "offer") {
				const offerData = await adapter.makeAnOffer(state.conversationHistory);
				const offerString = convertGateEnterOfferToString(offerData);

				const offer = DaiaOfferBuilder.new()
					.setNaturalLanguageContent(offerString)
					.setOfferTypeIdentifier(ENTER_OFFER_TYPE_IDENTIFIER)
					.addSelfSignedRequirement(adapter.getPrivateKey())
					.addSignRequirement(DaiaLanggraphStateAccessor.fromNamespacedState(state).remotePublicKey()!)
					.build();

				const daia = DaiaLanggraphStateWriter.fromState(state.daia)
					.setMethodCall({
						methodId: DaiaLanggraphMethodId.SEND_OFFER,
						offer,
					})
					.build();

				return new Command({
					goto: "daiaSubgraph",
					update: {
						daia,
						lastOffer: offerData,
						conversationHistory: [
							...state.conversationHistory,
							{ role: "user" as const, content: input },
							{ role: "assistant" as const, content: offerString },
						],
					},
				});
			}

			return state;
		})
		.addEdge(continueConversation, END)
		.addEdge(sendDaiaOutput, END)
		.addEdge(afterOfferReceived, "daiaSubgraph")
		.addEdge(afterRemoteProcessedLocalOffer, END)
		.addEdge("handleInputs", "daiaSubgraph")
		.addEdge(START, "handleInputs");

	return graph as StateGraph<z.infer<typeof GateEnterAgentStateSchema>>;
}
