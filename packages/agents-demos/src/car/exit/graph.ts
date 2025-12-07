import {
	DaiaLanggraphMachineNode,
	DaiaLanggraphStateAccessor,
	DaiaLanggraphStateWriter,
	makeDaiaGraph,
} from "@daia/langchain";
import {
	DaiaAgreementReferenceResult,
	DaiaOfferRequirement,
	DaiaOfferSignResponseType,
	DaiaRequirementType,
} from "@daia/core";
import { END, START, StateGraph } from "@langchain/langgraph";
import { produce } from "immer";
import z from "zod/v3";
import { CarExitAgentAdapter } from "./adapter";
import { CarExitAgentStateSchema } from "./state";
import { sleep } from "../../util";
import { EXIT_OFFER_TYPE_IDENTIFIER } from "../../common/consts";

export function createCarExitAgentGraph(adapter: CarExitAgentAdapter) {
	const daiaSubgraph = makeDaiaGraph<z.infer<typeof CarExitAgentStateSchema>>({
		publicKey: adapter.getPublicKey().toString(),
		mapNode: (node) => "D_" + node,
	});

	const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT;
	const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING;
	const remoteProcessedLocalOffer = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER;
	const afterOfferReceived = "D_" + DaiaLanggraphMachineNode.OFFER_RECEIVED;

	const now = new Date();
	const agreement = adapter.getMemory().getParkAgreement();

	if (!agreement) {
		throw new Error(`Car is not parked; Can't run exit agent.`);
	}

	const graph = new StateGraph(CarExitAgentStateSchema)
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
				ends: [sendDaiaOutput, continueConversation, remoteProcessedLocalOffer, afterOfferReceived],
			},
		)
		.addNode(afterOfferReceived, async (state) => {
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
			const offer = accessor.getOffer();
			if (!offer) throw new Error("Offer not found");

			const remotePublicKey = accessor.remotePublicKey();
			if (!remotePublicKey) throw new Error("Remote public key not found");

			const summary = await adapter.getSigner().summarizeOffer(offer);

			if (summary.content.offerTypeIdentifier !== EXIT_OFFER_TYPE_IDENTIFIER) {
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

			const parkTimeMillis = now.getTime() - agreement.parkTime.getTime();
			const parkTimeHours = parkTimeMillis / (1000 * 60 * 60);
			const hourlyRate = await adapter.calculateParkHourlyRate(agreement.content);
			const expectedTotalAmount = Math.ceil(parkTimeHours * hourlyRate);

			const totalPaymentAmount = Object.values(summary.payments).reduce(
				(sum, amount) => sum + amount,
				0,
			);

			// Allow some leeway for minor time discrapancies
			if (totalPaymentAmount > expectedTotalAmount * 1.1) {
				return produce(state, (draft) => {
					const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
						.setOfferResponse({
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: `Payment amount mismatch: expected ${expectedTotalAmount} satoshis, but offer contains ${totalPaymentAmount} satoshis`,
						})
						.build();

					draft.daia = daiaState;
				});
			}

			// Check if there is a signature requirement from remotePublicKey (self-signed)
			const requirements = summary.content.requirements;
			const requirementsArray = Array.isArray(requirements)
				? requirements
				: Object.values(requirements || {});
			const hasRemoteSignature = requirementsArray.some(
				(req: DaiaOfferRequirement) =>
					req.type === DaiaRequirementType.SIGN && req.pubKey === remotePublicKey,
			);

			if (!hasRemoteSignature) {
				return produce(state, (draft) => {
					const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
						.setOfferResponse({
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: `Offer must include a self-signed signature requirement from remote public key ${remotePublicKey}`,
						})
						.build();

					draft.daia = daiaState;
				});
			}

			const signResponse = await adapter.getSigner().signOffer({
				offer,
			});

			if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
				throw new Error(`Failed to sign offer. Can't satisfy requirements.`);
			}

			if (adapter.getConfig().publishAgreement) {
				await signResponse.transaction.publish();
				await sleep(5000);
			}

			return produce(state, (draft) => {
				const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
					.setOfferResponse({
						result: DaiaAgreementReferenceResult.ACCEPT,
						agreement: signResponse.agreement,
						agreementReference: signResponse.transaction.id,
					})
					.build();

				draft.isAuthenticatedToLeave = true;
				draft.daia = daiaState;
			});
		})
		.addNode(remoteProcessedLocalOffer, async (state) => {
			return produce(state, (draft) => {
				draft.output = "I request offer for exitting the parking lot.";
			});
		})
		.addNode(sendDaiaOutput, async (state) => {
			return produce(state, (draft) => {
				draft.output = DaiaLanggraphStateAccessor.fromNamespacedState(state).getOutput();
			});
		})
		.addNode(continueConversation, async (state) => {
			if (state.isAuthenticatedToLeave) {
				adapter.getMemory().clearState();

				return produce(state, (draft) => {
					draft.output = "I'll leave the parking now.";
				});
			}
			// In exit scenario, car needs to request an offer by sending its public key
			// This is handled by the DAIA subgraph, just return empty output and let
			// the next iteration handle the actual offer request
			return produce(state, (draft) => {
				draft.output = "I requirest an offer to exit the parking";
			});
		})
		.addEdge(continueConversation, END)
		.addEdge(sendDaiaOutput, END)
		.addEdge(afterOfferReceived, "daiaSubgraph")
		.addEdge(remoteProcessedLocalOffer, END)
		.addEdge("handleInputs", "daiaSubgraph")
		.addEdge(START, "handleInputs");

	return graph as StateGraph<z.infer<typeof CarExitAgentStateSchema>>;
}
