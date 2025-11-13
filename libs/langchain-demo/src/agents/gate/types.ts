/**
 * Parking Gate Agent Types
 */

import type { BaseMessage } from "@langchain/core/messages";
import type { DaiaOfferContent } from "@d4ia/proto";

export interface ParkingGateContext {
  messages: BaseMessage[];
  gateId: string;
  state: ParkingGateState;
  rates: {
    min: number;
    max: number;
    preferred: number;
  };
  offersSent: OfferRecord[];
  remotePublicKey: string | null;
}

export enum ParkingGateState {
  Initial = "initial",
  WaitingForPubKey = "waiting_for_pubkey",
  SendingPubKey = "sending_pubkey",
  WaitingForRequest = "waiting_for_request",
  WaitingForResponse = "waiting_for_response",
  Accepted = "accepted",
  Rejected = "rejected",
  Done = "done",
}

export const MAX_OFFERS_TO_SEND = 3;

export interface OfferRecord {
  offer: DaiaOfferContent;
  sentAt: Date;
}
