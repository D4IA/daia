import {
	DaiaLanggraphMachineNode,
	DaiaLanggraphMethodId,
	DaiaLanggraphStateAccessor,
	DaiaLanggraphStateWriter,
	makeDaiaGraph,
} from "@d4ia/langchain";
import { DaiaAgreementReferenceResult, DaiaOfferBuilder } from "@d4ia/core";
import { Command, END, START, StateGraph } from "@langchain/langgraph";
import { produce } from "immer";
import z from "zod/v3";
import { GateAgentExitAdapter } from "./adapter";
import { convertGateExitOfferToString, GateExitAgentStateSchema } from "./state";
import { EXIT_OFFER_TYPE_IDENTIFIER } from "../../common/consts";
import { sleep } from "../../util";

export function createGateExitAgentGraph(adapter: GateAgentExitAdapter) {
	const daiaSubgraph = makeDaiaGraph<z.infer<typeof GateExitAgentStateSchema>>({
		publicKey: adapter.getPublicKey().toString(),
		mapNode: (node) => "D_" + node,
	});

	const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT;
	const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING;
	const afterRemoteProcessedLocalOffer = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER;
	const afterOfferReceived = "D_" + DaiaLanggraphMachineNode.OFFER_RECEIVED;

	const graph = new StateGraph(GateExitAgentStateSchema)
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
			const offer = accessor.getOffer();

			if (!offer) {
				throw new Error("No offer to reject");
			}

			return produce(state, (draft) => {
				const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
					.setOfferResponse({
						result: DaiaAgreementReferenceResult.REJECT,
						rationale: "Offer rejected by gate exit agent",
					})
					.build();

				draft.daia = daiaState;
			});
		})
		.addNode(afterRemoteProcessedLocalOffer, async (state) => {
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
			const response = accessor.getOfferResponse();

			adapter.log("\n🔍 Gate Exit: Processing car's offer response...");

			if (!response) throw new Error("Unreachable; Offer response must be present at this point");

			adapter.log(`  📋 Response type: ${response.result}`);
			if (response.result === DaiaAgreementReferenceResult.ACCEPT) {
				adapter.log(`  ✅ Car accepted the payment offer`);
			} else if (response.result === DaiaAgreementReferenceResult.REJECT) {
				adapter.log(`  ❌ Car rejected the payment offer`);
				adapter.log(`  📝 Rejection rationale: ${response.rationale || "none provided"}`);
			}

			if (response.result === DaiaAgreementReferenceResult.ACCEPT) {
				let verificationPassed = false;

				// Fetch and verify agreement from blockchain transaction
				const agreementReference = response.agreementReference;
				adapter.log("  🔗 Fetching agreement from blockchain: " + agreementReference);

				// Retry logic: 5 attempts with 5 second delays
				let verificationResult = undefined;
				for (let attempt = 1; attempt <= 5; attempt++) {
					adapter.log(`  ⏳ Fetching transaction, attempt ${attempt}/5...`);
					verificationResult = await adapter
						.getVerifier()
						.getAgreementFromTransaction(agreementReference);
					if (verificationResult.found) {
						break; // Success, exit retry loop
					}

					// If not found, wait and retry
					if (!verificationResult.found && attempt < 5) {
						await sleep(5000);
					}
				}
				verificationPassed = Boolean(
					verificationResult &&
						verificationResult.found &&
						verificationResult.verification.result === "passed",
				);

				if (verificationResult) {
					adapter.log("  🔍 Verification result:");
					adapter.log(`    - Transaction found: ${verificationResult.found}`);
					if (verificationResult.found) {
						adapter.log(`    - Verification status: ${verificationResult.verification.result}`);
						if (verificationResult.verification.result === "failed") {
							adapter.log(`    - Failure: ${JSON.stringify(verificationResult.verification.failure)}`);
						}
					}
				} else {
					adapter.log("  ⚠️  No verification result - transaction may be empty or invalid");
				}

				adapter.log(`\n  ⚖️  Final verification status: ${verificationPassed ? "PASSED" : "FAILED"}`);

				if (!verificationPassed) {
					adapter.log("  ❌ REJECTING exit - verification failed");
					await adapter.finalizeCar("reject");
					return produce(state, (draft) => {
						draft.output = {
							type: "reject-client",
						};
					});
				}

				adapter.log("  ✅ Payment verified successfully!");

				// Remove car from database
				const licensePlate = adapter.getCarLicensePlate();
				adapter.log(`  🗑️  Removing car ${licensePlate} from database...`);
				const carEntry = adapter.getCarsDB().getByPlate(licensePlate);
				if (carEntry) {
					adapter.getCarsDB().remove(carEntry.id);
					adapter.log(`  ✓ Car removed from database`);
				}

				adapter.log("  🚪 LETTING CAR OUT");
				await adapter.finalizeCar("let-out");
				const clearanceMessage =
					"Payment verified successfully. You are cleared to leave the parking lot. Have a safe journey!";
				return produce(state, (draft) => {
					draft.isCarAuthenticatedToLeave = true;
					draft.conversationHistory.push({
						role: "assistant" as const,
						content: clearanceMessage,
					});
					draft.output = {
						type: "response",
						response: clearanceMessage,
					};
				});
			} else if (response.result === DaiaAgreementReferenceResult.REJECT) {
				adapter.log("  ❌ REJECTING exit - car rejected the payment offer");
				await adapter.finalizeCar("reject");
				return produce(state, (draft) => {
					draft.output = {
						type: "reject-client",
					};
				});
			} else {
				throw new Error("Unreachable; Unknown DaiaAgreementReferenceResult");
			}
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
			const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);

			// If car is already cleared to leave, open the gate
			if (state.isCarAuthenticatedToLeave) {
				return produce(state, (draft) => {
					draft.output = {
						type: "accept-client",
					};
				});
			}

			// Check if protocol is ready (public keys exchanged)
			const remotePublicKey = accessor.remotePublicKey();
			if (!remotePublicKey) {
				// Protocol not ready yet, just acknowledge the request
				return produce(state, (draft) => {
					draft.output = {
						type: "response",
						response: "I'll prepare your exit offer. Please wait.",
					};
				});
			}

			const licensePlate = adapter.getCarLicensePlate();

			// Get car data from database
			const carEntry = adapter.getCarsDB().getByPlate(licensePlate);

			if (!carEntry) {
				throw new Error(`Car with license plate ${licensePlate} not found in database`);
			}

			const { data: carData } = carEntry;

			// Calculate parking duration and payment
			const now = new Date();
			const parkTimeMillis = now.getTime() - carData.parkedAt.getTime();
			const parkTimeHours = parkTimeMillis / (1000 * 60 * 60);
			const paymentAmount = Math.ceil(parkTimeHours * carData.ratePerHour);

			console.log("Expected payment amont", paymentAmount);

			// Create offer data
			const offerData = { paymentAmount };
			const offerString = convertGateExitOfferToString(offerData);

			// Build the offer
			// Payment should go TO the gate (this agent), not to the car
			const gateAddress = adapter.getPublicKey().toAddress("testnet").toString();
			const offer = DaiaOfferBuilder.new()
				.setNaturalLanguageContent(offerString)
				.setOfferTypeIdentifier(EXIT_OFFER_TYPE_IDENTIFIER)
				.addSelfSignedRequirement(adapter.getPrivateKey())
				.addSignRequirement(remotePublicKey)
				.addSelfAuthenticatedPaymentRequirement(gateAddress, paymentAmount, carData.parkingTransactionId)
				.build();

			// Update state to send the offer
			const daia = DaiaLanggraphStateWriter.fromState(state.daia)
				.clear()
				.setMethodCall({
					methodId: DaiaLanggraphMethodId.SEND_OFFER,
					offer,
				})
				.build();

			return new Command({
				goto: "daiaSubgraph",
				update: {
					daia,
					conversationHistory: [
						...state.conversationHistory,
						{ role: "assistant" as const, content: offerString },
					],
				},
			});
		})
		.addEdge(sendDaiaOutput, END)
		.addEdge(afterOfferReceived, "daiaSubgraph")
		.addEdge(afterRemoteProcessedLocalOffer, END)
		.addEdge("handleInputs", "daiaSubgraph")
		.addEdge(START, "handleInputs");

	return graph as StateGraph<z.infer<typeof GateExitAgentStateSchema>>;
}
