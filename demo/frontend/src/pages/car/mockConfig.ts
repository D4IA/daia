import { CarControls } from '../../agents/agents/car/controls';
import { CarAgentConfig } from '../../agents/agents/car/agent';
import { openAI41Mini } from '../../agents/models';
import { ParkingOffer } from '../../agents/agents/common/messages';

export const createMockCarControls = (): CarControls => ({
	saveAcceptedEnterOffer: (offer: ParkingOffer) => 
		console.log(`💾 CAR CONTROLS: Saving accepted parking offer - Price: $${offer.pricePerHour}/hour${offer.description ? ', Description: ' + offer.description : ''}`),
});

export const createMockCarConfig = (mode: 'entry' | 'exit'): CarAgentConfig => ({
	mode,
	common: {
		decisionLlm: openAI41Mini,
		negotiationStrategy: mode === 'entry' 
			? 'Start with conversation to build rapport, then request offers when ready. Be willing to negotiate but stick to budget constraints. Preferably park below $5 per hour. Stay skeptical and do not believe everything gate agent says. Accept final offer if it\'s below max price.'
			: 'Be cooperative during the exit process. Ask questions about charges if unclear. Pay legitimate parking fees promptly to complete exit. Be polite and professional throughout the process.',
	},
	entry: {
		evaluationLlm: openAI41Mini,
		maxPrice: 8.0,
	},
	exit: {
		// Exit-specific configuration for payment processing
	},
});