import { DaiaLanggraphState } from "../state";

/**
 * Enum of all langgraph nodes that DAIA expects to be defined in the langgraph graph that daia graph will be used in.
 */
export enum DaiaLanggraphMachineNode {
	SEND_DAIA_OUTPUT = "send-daia-output",
	OFFER_RECEIVED = "offer-received",
	CONTINUE_CONVERSING = "continue-conversing",
	REMOTE_PROCESSED_OFFER = "remote-processed-offer",
}

export type DaiaLanggraphStateMachineOutput = {
	newState: DaiaLanggraphState;
	targetNode: DaiaLanggraphMachineNode;
};
