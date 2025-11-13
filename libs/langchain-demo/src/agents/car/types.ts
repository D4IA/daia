/**
 * Car Agent Types
 */

import type { BaseMessage } from "@langchain/core/messages";

export interface CarContext {
  messages: BaseMessage[];
  carId: string;
  rates: {
    min: number; // Minimum acceptable rate (sat/hour)
    max: number; // Maximum willing to pay (sat/hour)
  };
}

export enum CarAgentState {
  Initial = "initial",
  RequestingPubKey = "requesting_pubkey",
  WaitingForPubKey = "waiting_for_pubkey",
  WaitingForOffer = "waiting_for_offer",
  Accepted = "accepted",
  Rejected = "rejected",
  Done = "done",
}

export const MAX_OFFERS_TO_RECEIVE = 3;
