import {
	DaiaLanggraphMachineNode,
	DaiaLanggraphStateAccessor,
	DaiaLanggraphStateWriter,
	makeDaiaGraph,
} from "@d4ia/langchain";
import { END, START, StateGraph } from "@langchain/langgraph";
import { produce } from "immer";
import z from "zod/v3";
import { CarEnterAgentAdapter } from "./adapter";
import { CarEnterAgentStateSchema } from "./state";
import { ENTER_OFFER_TYPE_IDENTIFIER } from "../../common/consts";
import { DaiaAgreementReferenceResult, DaiaOfferSignResponseType } from "@d4ia/core";
import { sleep } from "../../util";

export function createCarEnterAgentGraph(adapter: CarEnterAgentAdapter) {
	const daiaSubgraph = makeDaiaGraph<z.infer<typeof CarEnterAgentStateSchema>>({
		publicKey: adapter.getPublicKey().toString(),
		mapNode: (node) => "D_" + node,
	});

	const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT;
	const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING;
	const afterPublicIdentityReceived = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER;
	const afterOfferReceived = "D_" + DaiaLanggraphMachineNode.OFFER_RECEIVED;

	const graph = new StateGraph(CarEnterAgentStateSchema)
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
				ends: [sendDaiaOutput, continueConversation, afterPublicIdentityReceived, afterOfferReceived],
			},
		)
		.addNode(afterOfferReceived, async (state) => {
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
			const offerRaw = accessor.getOffer();
			if (!offerRaw) throw new Error("Unreachable; Offer must be present at this point");
			const result = await adapter.getSigner().summarizeOffer(offerRaw);

			if (result.content.offerTypeIdentifier !== ENTER_OFFER_TYPE_IDENTIFIER) {
				return produce(state, (draft) => {
					const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
						.setOfferResponse({
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: "Invalid offer type identifier",
						})
						.build();

					draft.daia = daiaState;
				});
			}

			if (Object.keys(result.payments).length > 0) {
				return produce(state, (draft) => {
					const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
						.setOfferResponse({
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: "Offer contains payments, where it's expected not to have any",
						})
						.build();

					draft.daia = daiaState;
				});
			}

			// TODO: assert that offer is signed by the gate and has a requirement for our signature with proper public key

			const decision = await adapter.considerOffer(result.content.naturalLanguageOfferContent, state.conversationHistory);

			if (decision.accepted) {
				const signResponse = await adapter.getSigner().signOffer({
					offer: offerRaw,
				});

				if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
					throw new Error(`Unexpected offer signing failure: ${signResponse.type}`);
				}

				if (adapter.getConfig().shouldPublishTransactions) {
					await signResponse.transaction.publish();
					await sleep(5000); // 5s sleep for publish to propagate
				}

				// Store parking information in memory
				adapter
					.getMemory()
					.park(result.content.naturalLanguageOfferContent, signResponse.transaction.id, new Date());

				return produce(state, (draft) => {
					draft.conversationHistory.push(
						{
							role: "user" as const,
							content: `INCOMING OFFER TO CONSIDER: ${result.content.naturalLanguageOfferContent}`,
						},
						{ role: "assistant" as const, content: `ANALYSIS RESULT: ACCEPT` },
					);

					const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
						.setOfferResponse({
							result: DaiaAgreementReferenceResult.ACCEPT,
							agreement: signResponse.agreement,
							agreementReference: signResponse.transaction.id,
						})
						.build();

					draft.daia = daiaState;
				});
			} else {
				return produce(state, (draft) => {
					draft.conversationHistory.push(
						{
							role: "user" as const,
							content: `INCOMING OFFER TO CONSIDER: ${result.content.naturalLanguageOfferContent}`,
						},
						{ role: "assistant" as const, content: `ANALYSIS RESULT: REJECT - ${decision.rationale}` },
					);

					const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
						.setOfferResponse({
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: decision.rationale,
						})
						.build();

					draft.daia = daiaState;
				});
			}
		})
		.addNode(afterPublicIdentityReceived, async (state) => {
			const assistantResponse = await adapter.runConversation(
				state.conversationHistory,
				"", // No input, just process the identity exchange; Treat it as order to start conversation
			);

			return produce(state, (draft) => {
				draft.output = assistantResponse;
				draft.conversationHistory.push(
					{ role: "user" as const, content: "" },
					{ role: "assistant" as const, content: assistantResponse },
				);
			});
		})
		.addNode(sendDaiaOutput, async (state) => {
			return produce(state, (draft) => {
				draft.output = DaiaLanggraphStateAccessor.fromNamespacedState(state).getOutput();
			});
		})
		.addNode(continueConversation, async (state) => {
			const input = DaiaLanggraphStateAccessor.fromNamespacedState(state).getInput();

			const assistantResponse = await adapter.runConversation(state.conversationHistory, input);

			return produce(state, (draft) => {
				draft.output = assistantResponse;
				draft.conversationHistory.push(
					{ role: "user" as const, content: input },
					{ role: "assistant" as const, content: assistantResponse },
				);
			});
		})
		.addEdge(continueConversation, END)
		.addEdge(sendDaiaOutput, END)
		.addEdge(afterOfferReceived, "daiaSubgraph")
		.addEdge(afterPublicIdentityReceived, END)
		.addEdge("handleInputs", "daiaSubgraph")
		.addEdge(START, "handleInputs");

	return graph as StateGraph<z.infer<typeof CarEnterAgentStateSchema>>;
}
