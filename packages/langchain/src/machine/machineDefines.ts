import { DaiaLanggraphState } from "../state";

export enum DaiaStateMachineTargetNode {
	SEND_DAIA_OUTPUT = "send-daia-output",
	END_CONNECTION = "end-connection",
	CONTINUE_CONVERSING = "continue-conversing",
	OFFER_RECEIVED = "offer-received",
	PUBLIC_IDENTITY_RECEIVED = "public-identity-received",
	REMOTE_PROCESSED_OFFER = "remote-processed-offer",
}

export type DaiaStateMachineOutput = {
	newState: DaiaLanggraphState;
	targetNode: DaiaStateMachineTargetNode;
};
