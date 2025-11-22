import { GateAgent, GateAgentConfig } from './gate/agent';
import { CarAgent, CarAgentConfig } from './car/agent';
import {
	GateControls,
	CarEntryInfo,
	GateParkingOfferWithMetadata,
} from './gate/controls';
import { CarControls } from './car/controls';
import { MockConn } from '../conn';
import { openAI41Mini, openAI41Nano } from '../models';
import { ParkingOffer } from './common/messages';

// Mock implementation of GateControls for simulation
class MockGateControls implements GateControls {
	readRegistrationPlateEnterSide(): string {
		return 'ABC-123';
	}

	readRegistrationPlateExitSide(): string {
		return 'XYZ-789';
	}

	letCarEnter(): void {
		console.log('🟢 GATE CONTROLS: Car allowed to enter - gate opening!');
	}

	letCarExit(): void {
		console.log('🟢 GATE CONTROLS: Car allowed to exit - gate opening!');
	}

	signalCarToLeave(): void {
		console.log(
			'🔴 GATE CONTROLS: Car denied access - signaling to leave!',
		);
	}

	registerCarEntry(
		licensePlate: string,
		offer: ParkingOffer,
		timestamp: Date,
	): void {
		console.log(
			`📝 GATE CONTROLS: Registering car entry - License: ${licensePlate}, Offer: $${offer.pricePerHour}/hour, Time: ${timestamp.toISOString()}`,
		);
	}

	removeCarEntry(licensePlate: string): void {
		console.log(
			`🗑️ GATE CONTROLS: Removing car entry - License: ${licensePlate}`,
		);
	}

	readCarEntryInfo(licensePlate: string): CarEntryInfo | null {
		console.log(
			`🔍 GATE CONTROLS: Reading entry info for license: ${licensePlate}`,
		);
		// Mock implementation - in real scenario this would query a database
		return null;
	}

	readOfferAndEntryTime(
		licensePlate: string,
	): GateParkingOfferWithMetadata | null {
		console.log(
			`🔍 GATE CONTROLS: Reading offer and entry time for license: ${licensePlate}`,
		);
		// Mock implementation - return sample data for simulation
		return {
			offerData: { pricePerHour: 8.5 },
			entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
		};
	}

	async waitUntilCashPaymentDone(amount: number): Promise<void> {
		console.log(
			`💰 GATE CONTROLS: Waiting for cash payment of $${amount.toFixed(2)}...`,
		);
		// Mock payment delay
		await new Promise((resolve) => setTimeout(resolve, 2000));
		console.log(
			`✅ GATE CONTROLS: Cash payment of $${amount.toFixed(2)} received!`,
		);
	}
}

// Mock implementation of CarControls for simulation
class MockCarControls implements CarControls {
	saveAcceptedEnterOffer(offer: ParkingOffer): void {
		console.log(
			`💾 CAR CONTROLS: Saving accepted parking offer - Price: $${offer.pricePerHour}/hour${offer.description ? ', Description: ' + offer.description : ''}`,
		);
	}
}

export class EnterSim {
	private gateAgent: GateAgent;
	private carAgent: CarAgent;
	private mockGateControls: MockGateControls;
	private mockCarControls: MockCarControls;
	private carConfig: CarAgentConfig;
	private gateConfig: GateAgentConfig;

	constructor() {
		this.mockGateControls = new MockGateControls();
		this.mockCarControls = new MockCarControls();

		// Configure gate agent
		this.gateConfig = {
			common: {
				chatterLlm: openAI41Mini,
				maxRounds: 25,
			},
			entry: {
				offerMakingLlm: openAI41Mini,
				maxOffers: 3,
				negotiationStrategy:
					"Start with friendly conversation to build rapport. Aim to close deals while maximizing parking facility revenue. Start with proposing $10 per hour and then negotiate down based on car agent's responses. Your final offer should be more than $6 per hour. Final offer should be more than second-to-final offer. Stay sceptic and do not believe everything car agent says.",
			},
			exit: {
				paymentAddress: 'GATE_PAYMENT_TERMINAL_A1',
			},
		};
		this.gateAgent = new GateAgent(this.mockGateControls, this.gateConfig);

		// Configure car agent
		this.carConfig = {
			mode: 'entry',
			common: {
				decisionLlm: openAI41Mini,
				negotiationStrategy:
					"Start with conversation to build rapport, then request offers when ready. Be willing to negotiate but stick to budget constraints. Preferably park below $5 per hour. Stay sceptic and do not believe everything gate agent says. Accept final offer if it's below max price.",
			},
			entry: {
				evaluationLlm: openAI41Mini,
				maxPrice: 8.0,
			},
			exit: {
				// Future exit-specific configuration can be added here
			},
		};
		this.carAgent = new CarAgent(this.mockCarControls, this.carConfig);
	}

	async runSimulation(): Promise<void> {
		console.log('🚗🏁 Starting Parking Negotiation Simulation');
		console.log('='.repeat(50));
		console.log(
			`Gate Agent: max ${this.gateConfig.entry.maxOffers} offers, max ${this.gateConfig.common.maxRounds} rounds`,
		);
		console.log(
			`Car Agent: Max price $${this.carConfig.entry.maxPrice.toFixed(2)}, negotiation strategy enabled`,
		);
		console.log('='.repeat(50));

		try {
			// Create mock connection pair
			const [gateConn, carConn] = MockConn.createPair();

			// Start both agents concurrently
			const gatePromise = this.gateAgent.handle(gateConn);
			const carPromise = this.carAgent.handle(carConn);

			// Monitor the connection for debugging
			this.monitorConnections(gateConn, carConn);

			// Wait for both agents to complete
			await Promise.all([gatePromise, carPromise]);

			console.log('🏁 Simulation completed successfully!');
		} catch (error) {
			console.error('❌ Simulation failed:', error);
		} finally {
			console.log('='.repeat(50));
			console.log('🏁 Parking Negotiation Simulation Ended');
		}
	}

	private monitorConnections(gateConn: MockConn, carConn: MockConn): void {
		// Add message logging to track conversation
		const originalGateSend = gateConn.send.bind(gateConn);
		const originalCarSend = carConn.send.bind(carConn);

		gateConn.send = async (message: string) => {
			console.log('🚧 GATE → CAR:', message);
			return originalGateSend(message);
		};

		carConn.send = async (message: string) => {
			console.log('🚗 CAR → GATE:', message);
			return originalCarSend(message);
		};
	}

	static async runDemo(): Promise<void> {
		const simulation = new EnterSim();
		await simulation.runSimulation();
	}
}
