export type GateAgentConversationResponse =
	| {
			type: "text";
			text: string;
	  }
	| {
			type: "offer";
	  };

export type GateAgentOfferData = {
	ratePerHour: number;
};

export const convertGateOfferToString = (data: GateAgentOfferData): string => {
	return `Parking services are offered at a rate of ${data.ratePerHour} satoshis per hour.`;
};
