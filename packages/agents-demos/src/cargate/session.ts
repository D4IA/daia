import type { Car, Gate, CarGateSimulationEnvironmentConfig } from "./environment";
import { CarEnterAgent } from "../car/enter";
import { CarExitAgent } from "../car/exit";
import { CarExitAgentAdapterImpl } from "../car/exit/adapterImpl";
import { GateAgent } from "../gate/enter";
import { GateExitAgent } from "../gate/exit";
import { GateAgentEnterAdapterImpl } from "../gate/enter/adapterImpl";
import { GateAgentExitAdapterImpl } from "../gate/exit/adapterImpl";
import {
	DefaultDaiaOfferSigner,
	DefaultDaiaAgreementVerifier,
	DefaultDaiaSignRequirementResolver,
	DefaultDaiaPaymentRequirementResolver,
} from "@daia/core";
import {
	BsvTransactionParser,
	BsvTransactionFactory,
	WhatsOnChainUtxoProvider,
} from "@daia/blockchain";
import { CarAgentMemory } from "../car/db/memory";
import { GateAgentCarsDB } from "../gate";

export type SessionType = "enter" | "exit";

type EnterAgents = {
	car: CarEnterAgent;
	gate: GateAgent;
};

type ExitAgents = {
	car: CarExitAgent;
	gate: GateExitAgent;
};

export enum CarGateSimulationEventType {
	CAR_TO_GATE_MESSAGE = "CAR_TO_GATE_MESSAGE",
	GATE_TO_CAR_MESSAGE = "GATE_TO_CAR_MESSAGE",
	GATE_ACTION = "GATE_ACTION",
	SESSION_END = "SESSION_END",
	MAX_TURNS_REACHED = "MAX_TURNS_REACHED",
	GATE_LOG = "GATE_LOG",
	CAR_LOG = "CAR_LOG",
}

export type CarGateSimulationEvent =
	| {
			type: CarGateSimulationEventType.GATE_ACTION;
			action: "let-in" | "let-out" | "reject";
	  }
	| {
			type:
				| CarGateSimulationEventType.CAR_TO_GATE_MESSAGE
				| CarGateSimulationEventType.GATE_TO_CAR_MESSAGE;
			message: string;
	  }
	| {
			type: CarGateSimulationEventType.SESSION_END;
			side: "car" | "gate";
	  }
	| {
			type: CarGateSimulationEventType.MAX_TURNS_REACHED;
			turns: number;
	  }
	| {
			type: CarGateSimulationEventType.GATE_LOG;
			message: string;
	  }
	| {
			type: CarGateSimulationEventType.CAR_LOG;
			message: string;
	  };

export type CarGateSimulationSessionResult = {
	carMemory: CarAgentMemory;
	gateDb: GateAgentCarsDB;
};

export type CarGateSimulationInput = {
	onNewMessage: (message: CarGateSimulationEvent) => void;
};

export class CarGateSimulationSession {
	private readonly messageHistory: CarGateSimulationEvent[] = [];

	constructor(
		private readonly inputGate: Gate,
		private readonly inputCar: Car,
		private readonly envConfig: CarGateSimulationEnvironmentConfig,
	) {}

	public readonly getEvents = (): CarGateSimulationEvent[] => {
		return [...this.messageHistory];
	};

	private readonly detectSessionType = (): SessionType => {
		const carIsParked = this.inputCar.memory.isParked;
		const gateHasRecord =
			this.inputGate.db.getByPlate(this.inputCar.config.licensePlate) !== undefined;

		if (!carIsParked && !gateHasRecord) {
			return "enter";
		}

		if (carIsParked && gateHasRecord) {
			return "exit";
		}

		throw new Error(
			`Inconsistent state for car ${this.inputCar.config.licensePlate}: ` +
				`car thinks it's ${carIsParked ? "parked" : "not parked"}, ` +
				`but gate ${gateHasRecord ? "has" : "doesn't have"} a record`,
		);
	};

	public readonly setupAgents = (
		onEvent: (event: CarGateSimulationEvent) => void,
	): EnterAgents | ExitAgents => {
		const sessionType = this.detectSessionType();
		const transactionParser = new BsvTransactionParser(this.envConfig.network);

		if (sessionType === "enter") {
			// Setup car signer
			const carUtxoProvider = new WhatsOnChainUtxoProvider(
				this.inputCar.config.privateKey,
				this.envConfig.network,
			);
			const carFactory = new BsvTransactionFactory(
				this.inputCar.config.privateKey,
				this.envConfig.network,
				1,
				carUtxoProvider,
			);
			const signResolver = new DefaultDaiaSignRequirementResolver(this.inputCar.config.privateKey);
			const paymentResolver = new DefaultDaiaPaymentRequirementResolver(carFactory);
			const carSigner = new DefaultDaiaOfferSigner({
				transactionFactory: carFactory,
				signResolver,
				paymentResolver,
			});

			// Create car enter agent
			const carAgent = new CarEnterAgent({
				privateKey: this.inputCar.config.privateKey,
				conversingPrompt: this.inputCar.config.negotiationPrompt,
				offerAnalysisPrompt: this.inputCar.config.offerConsiderationPrompt,
				conversingModel: this.inputCar.config.negotiationModel,
				offerAnalysisModel: this.inputCar.config.offerConsiderationModel,
				openAIApiKey: this.envConfig.openAIApiKey,
				signer: carSigner,
				memory: this.inputCar.memory,
				shouldPublishTransactions: true,
				logCallback: (message: string) =>
					onEvent({
						type: CarGateSimulationEventType.CAR_LOG,
						message,
					}),
			});

			// Setup gate verifier
			const gateVerifier = new DefaultDaiaAgreementVerifier(transactionParser);

			// Create gate enter agent
			const gateAdapter = new GateAgentEnterAdapterImpl({
				db: this.inputGate.db,
				privateKey: this.inputGate.privateKey,
				verifier: gateVerifier,
				licensePlate: this.inputCar.config.licensePlate,
				openAIApiKey: this.envConfig.openAIApiKey,
				conversingModel: this.envConfig.gateConfig.conversationModel,
				conversingPrompt: this.envConfig.gateConfig.conversationPrompt,
				offerGenerationModel: this.envConfig.gateConfig.offerGeneratingModel,
				offerGenerationPrompt: this.envConfig.gateConfig.offerGeneratingPrompt,
				finalizeCarCallback: async (result: "let-in" | "reject") => {
					onEvent({
						type: CarGateSimulationEventType.GATE_ACTION,
						action: result,
					});
				},
				logCallback: (message: string) =>
					onEvent({
						type: CarGateSimulationEventType.GATE_LOG,
						message,
					}),
			});
			const gateAgent = new GateAgent(gateAdapter);

			return { car: carAgent, gate: gateAgent };
		} else {
			// Setup car signer for exit
			const carUtxoProvider = new WhatsOnChainUtxoProvider(
				this.inputCar.config.privateKey,
				this.envConfig.network,
			);
			const carFactory = new BsvTransactionFactory(
				this.inputCar.config.privateKey,
				this.envConfig.network,
				1,
				carUtxoProvider,
			);
			const signResolver = new DefaultDaiaSignRequirementResolver(this.inputCar.config.privateKey);
			const paymentResolver = new DefaultDaiaPaymentRequirementResolver(carFactory);
			const carSigner = new DefaultDaiaOfferSigner({
				transactionFactory: carFactory,
				signResolver,
				paymentResolver,
			});

			// Create car exit adapter
			const carAdapter = new CarExitAgentAdapterImpl({
				signer: carSigner,
				config: {
					privateKey: this.inputCar.config.privateKey,
					extractParkingRatePrompt:
						"Extract the parking rate from this agreement as a single number. Quote the number from input.",
					publishAgreement: true,
					logCallback: (message: string) =>
						onEvent({
							type: CarGateSimulationEventType.CAR_LOG,
							message,
						}),
				},
				memory: this.inputCar.memory,
				openAIApiKey: this.envConfig.openAIApiKey,
				extractRateModel: this.inputCar.config.offerConsiderationModel,
			});
			const carAgent = new CarExitAgent(carAdapter);

			// Setup gate verifier for exit
			const gateVerifier = new DefaultDaiaAgreementVerifier(transactionParser);

			// Create gate exit adapter
			const gateAdapter = new GateAgentExitAdapterImpl({
				db: this.inputGate.db,
				privateKey: this.inputGate.privateKey,
				verifier: gateVerifier,
				licensePlate: this.inputCar.config.licensePlate,
				finalizeCarCallback: async (result: "let-out" | "reject") => {
					onEvent({
						type: CarGateSimulationEventType.GATE_ACTION,
						action: result,
					});
				},
				logCallback: (message: string) =>
					onEvent({
						type: CarGateSimulationEventType.GATE_LOG,
						message,
					}),
			});
			const gateAgent = new GateExitAgent(gateAdapter);

			return { car: carAgent, gate: gateAgent };
		}
	};

	public readonly run = async (
		input: CarGateSimulationInput,
	): Promise<CarGateSimulationSessionResult> => {
		const onEvent = (event: CarGateSimulationEvent) => {
			this.messageHistory.push(event);
			input.onNewMessage(event);
		};
		const agents = this.setupAgents(onEvent);

		let carMessage = "";
		let gateEnded = false;
		let currentTurn = 0;

		while (currentTurn < this.envConfig.maxTurns && !gateEnded) {
			currentTurn++;

			onEvent({ type: CarGateSimulationEventType.CAR_TO_GATE_MESSAGE, message: carMessage });
			const gateResponse = await agents.gate.processInput(carMessage);

			if (gateResponse.type === "end") {
				gateEnded = true;
				onEvent({ type: CarGateSimulationEventType.SESSION_END, side: "gate" });
				break;
			}

			if (gateResponse.type === "message") {
				onEvent({
					type: CarGateSimulationEventType.GATE_TO_CAR_MESSAGE,
					message: gateResponse.content,
				});
				const carResponse = await agents.car.processInput(gateResponse.content);

				if (carResponse.type === "message") {
					carMessage = carResponse.content;
				} else {
					break;
				}
			}
		}

		if (currentTurn >= this.envConfig.maxTurns) {
			onEvent({ type: CarGateSimulationEventType.MAX_TURNS_REACHED, turns: currentTurn });
		}

		return {
			carMemory: this.inputCar.memory,
			gateDb: this.inputGate.db,
		};
	};
}
