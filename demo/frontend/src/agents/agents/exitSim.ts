import { GateAgent, GateAgentConfig } from './gate/agent';
import { CarAgent, CarAgentConfig } from './car/agent';
import {
	GateControls,
	CarEntryInfo,
	GateParkingOfferWithMetadata,
} from './gate/controls';
import { CarControls } from './car/controls';
import { MockConn } from '../conn';
import { openAI41Mini } from '../models';
import { ParkingOffer } from './common/messages';

// Mock implementation of GateControls for exit simulation
class MockExitGateControls implements GateControls {
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
		console.log('🔴 GATE CONTROLS: Car denied exit - signaling issue!');
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
		// Mock implementation for exit simulation
		return {
			offer: { pricePerHour: 7.5 },
			entryTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
		};
	}

	readOfferAndEntryTime(
		licensePlate: string,
	): GateParkingOfferWithMetadata | null {
		console.log(
			`🔍 GATE CONTROLS: Reading offer and entry time for license: ${licensePlate}`,
		);
		// Mock implementation - return sample data for exit simulation
		return {
			offerData: { pricePerHour: 7.5 },
			entryTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
		};
	}

	async waitUntilCashPaymentDone(amount: number): Promise<void> {
		console.log(
			`💰 GATE CONTROLS: Waiting for cash payment of $${amount.toFixed(2)}...`,
		);
		// Mock payment delay
		await new Promise((resolve) => setTimeout(resolve, 1500));
		console.log(
			`✅ GATE CONTROLS: Cash payment of $${amount.toFixed(2)} received!`,
		);
	}
}

// Mock implementation of CarControls for exit simulation
class MockExitCarControls implements CarControls {
	saveAcceptedEnterOffer(offer: ParkingOffer): void {
		console.log(
			`💾 CAR CONTROLS: Saving accepted parking offer - Price: $${offer.pricePerHour}/hour${offer.description ? ', Description: ' + offer.description : ''}`,
		);
	}
}

export class ExitSim {
	private mockGateControls: MockExitGateControls;
	private mockCarControls: MockExitCarControls;
	private gateConfig: GateAgentConfig;

	constructor() {
		this.mockGateControls = new MockExitGateControls();
		this.mockCarControls = new MockExitCarControls();

		// Configure gate agent for exit operations
		this.gateConfig = {
			common: {
				chatterLlm: openAI41Mini,
				maxRounds: 20,
			},
			entry: {
				offerMakingLlm: openAI41Mini,
				maxOffers: 3,
				negotiationStrategy: 'Not used in exit mode',
			},
			exit: {
				paymentAddress: 'GATE_EXIT_PAYMENT_TERMINAL_B2',
			},
		};
	}

	async runExitSimulation(): Promise<void> {
		console.log('🚗🚪 Starting Parking Exit Simulation');
		console.log('='.repeat(50));
		console.log(
			`Gate Agent: max ${this.gateConfig.common.maxRounds} rounds`,
		);
		console.log('Car Agent: Exit mode, payment processing enabled');
		console.log('='.repeat(50));

		try {
			// Create gate agent for exit mode
			const exitGateAgent = new GateAgent(
				this.mockGateControls,
				this.gateConfig,
			);

			// Create car agent for exit mode
			const exitCarConfig: CarAgentConfig = {
				mode: 'exit',
				common: {
					decisionLlm: openAI41Mini,
					negotiationStrategy:
						'Be cooperative during the exit process. Ask questions about charges if unclear. Pay legitimate parking fees promptly to complete exit. Be polite and professional throughout the process.',
				},
				entry: {
					evaluationLlm: openAI41Mini,
					maxPrice: 10.0, // Not used in exit mode but required by interface
				},
				exit: {
					// Future exit-specific configuration can be added here
				},
			};
			const exitCarAgent = new CarAgent(
				this.mockCarControls,
				exitCarConfig,
			);

			// Create mock connection pair
			const [gateConn, carConn] = MockConn.createPair();

			// Monitor the connection for debugging
			this.monitorConnections(gateConn, carConn);

			// Start both agents concurrently
			const gatePromise = exitGateAgent.handle(gateConn);
			const carPromise = exitCarAgent.handle(carConn);

			// Wait for both agents to complete
			await Promise.all([gatePromise, carPromise]);

			console.log('🏁 Exit simulation completed successfully!');
		} catch (error) {
			console.error('❌ Exit simulation failed:', error);
		} finally {
			console.log('='.repeat(50));
			console.log('🏁 Parking Exit Simulation Ended');
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
		const simulation = new ExitSim();
		await simulation.runExitSimulation();
	}
}
