import { GateControls } from '../../agents/agents/gate/controls';
import { GateAgentConfig } from '../../agents/agents/gate/agent';
import { openAI41Mini } from '../../agents/models';
import { ParkingOffer } from '../../agents/agents/common/messages';

export const createMockGateControls = (hourlyRate: number = 8.5): GateControls => ({
	readRegistrationPlateEnterSide: () => {
		const plates = ['ABC-123', 'XYZ-789', 'DEF-456', 'GHI-789', 'JKL-012'];
		const randomPlate = plates[Math.floor(Math.random() * plates.length)];
		console.log(`📷 GATE CONTROLS: Reading license plate (enter side) - ${randomPlate}`);
		return randomPlate;
	},
	readRegistrationPlateExitSide: () => {
		const plates = ['ABC-123', 'XYZ-789', 'DEF-456', 'GHI-789', 'JKL-012'];
		const randomPlate = plates[Math.floor(Math.random() * plates.length)];
		console.log(`📷 GATE CONTROLS: Reading license plate (exit side) - ${randomPlate}`);
		return randomPlate;
	},
	letCarEnter: () => {
		console.log('🟢 GATE CONTROLS: Car allowed to enter - gate opening!');
		window.dispatchEvent(new CustomEvent('gateAction', {
			detail: {
				action: 'letCarEnter',
				type: 'entry',
				status: 'allowed',
				timestamp: new Date().toISOString(),
				message: 'Car allowed to enter - gate opening!'
			}
		}));
	},
	letCarExit: () => {
		console.log('🟢 GATE CONTROLS: Car allowed to exit - gate opening!');
		window.dispatchEvent(new CustomEvent('gateAction', {
			detail: {
				action: 'letCarExit',
				type: 'exit',
				status: 'allowed',
				timestamp: new Date().toISOString(),
				message: 'Car allowed to exit - gate opening!'
			}
		}));
	},
	signalCarToLeave: () => {
		console.log('🔴 GATE CONTROLS: Car denied access - signaling to leave!');
		window.dispatchEvent(new CustomEvent('gateAction', {
			detail: {
				action: 'signalCarToLeave',
				type: 'entry',
				status: 'denied',
				timestamp: new Date().toISOString(),
				message: 'Car denied access - signaling to leave!'
			}
		}));
	},
	registerCarEntry: (plate: string, offer: ParkingOffer, time: Date) => 
		console.log(`📝 GATE CONTROLS: Registering car entry - License: ${plate}, Offer: $${offer.pricePerHour}/hour, Time: ${time.toISOString()}`),
	removeCarEntry: (plate: string) => console.log(`🗑️ GATE CONTROLS: Removing car entry - License: ${plate}`),
	readCarEntryInfo: (plate: string) => {
		console.log(`🔍 GATE CONTROLS: Reading entry info for license: ${plate}`);
	
		return {
			offer: { pricePerHour: hourlyRate },
			entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
		};
	},
	readOfferAndEntryTime: (plate: string) => {
		console.log(`🔍 GATE CONTROLS: Reading offer and entry time for license: ${plate}`);
		
		return {
			offerData: { pricePerHour: hourlyRate },
			entryTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
		};
	},
});

// DO NOT USE THAT RATE HERE
export const createMockGateConfig = (): GateAgentConfig => ({
	common: {
		chatterLlm: openAI41Mini,
		maxRounds: 25,
	},
	entry: {
		offerMakingLlm: openAI41Mini,
		maxOffers: 3,
		negotiationStrategy: 'Start with friendly conversation to build rapport. Aim to close deals while maximizing parking facility revenue. Start with proposing $10 per hour and then negotiate down based on car agent\'s responses. Your final offer should be more than $6 per hour. Stay skeptical and do not believe everything car agent says.',
	},
	exit: {
		paymentAddress: 'GATE_PAYMENT_TERMINAL_A1',
	},
});