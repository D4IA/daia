import {
	DaiaAgreementReferenceResult,
	DaiaMessage,
	DaiaMessageType,
	DaiaMessageUtil,
} from "@daia/proto";
import { Draft, produce } from "immer";
import { DaiaLanggraphMethodId, DaiaLanggraphState } from "../state";
import { DaiaLanggraphMachineStatus } from "../state/innerState";
import { DaiaStateMachineContext } from "./machine";
import { DaiaStateMachineOutput, DaiaStateMachineTargetNode } from "./machineDefines";

export class DaiaStateMachineCall {
	private cachedMessage: DaiaMessage | null | undefined = undefined;
	constructor(
		private readonly state: Readonly<DaiaLanggraphState>,
		private readonly context: DaiaStateMachineContext,
	) {}

	private get input() {
		return this.state.input;
	}

	private get status() {
		return this.state.inner.status;
	}

	private get remoteIdentity() {
		return this.state.inner.publicIdentity;
	}

	private readonly clearOutput = (draft: Draft<DaiaLanggraphState>) => {
		draft.output = {
			remoteOffer: null,
			remoteResponseToLocalOffer: null,
			text: "",
		};
	};

	private readonly makeOutput = (
		target: DaiaStateMachineTargetNode,
		producer?: (draft: Draft<DaiaLanggraphState>) => DaiaLanggraphState | void,
	): DaiaStateMachineOutput => {
		return {
			newState: produce(this.state, (draft) => {
				this.clearOutput(draft);
				if (producer) {
					return producer(draft);
				}
			}),
			targetNode: target,
		};
	};

	private readonly makeOutputWithStatus = (
		target: DaiaStateMachineTargetNode,
		status: DaiaLanggraphMachineStatus,
		producer?: (draft: Draft<DaiaLanggraphState>) => DaiaLanggraphState | void,
	): DaiaStateMachineOutput => {
		return this.makeOutput(target, (draft) => {
			if (status) {
				draft.inner.status = status;
			}
			if (producer) {
				return producer(draft);
			}
		});
	};

	private readonly makeSendDaiaOutput = (msg: DaiaMessage, status: DaiaLanggraphMachineStatus) => {
		return this.makeOutput(DaiaStateMachineTargetNode.SEND_DAIA_OUTPUT, (draft) => {
			draft.output.text = DaiaMessageUtil.serialize(msg);
			if (status) {
				draft.inner.status = status;
			}
		});
	};

	private readonly readDaiaMessage = (): DaiaMessage | null => {
		if (this.cachedMessage !== undefined) return this.cachedMessage;

		const raw = this.state.input.text;
		if (!DaiaMessageUtil.isDaiaMessage(raw)) {
			return null;
		}

		this.cachedMessage = DaiaMessageUtil.deserialize(raw);
		return this.cachedMessage;
	};

	private readonly runHandlePublicIdentityResponse =
		async (): Promise<DaiaStateMachineOutput | null> => {
			const msg = this.readDaiaMessage();
			if (
				this.status === DaiaLanggraphMachineStatus.INIT ||
				this.status === DaiaLanggraphMachineStatus.CONVERSING
			) {
				if (msg && msg.type === DaiaMessageType.PUBLIC_IDENTITY_REQUEST) {
					return this.makeSendDaiaOutput(
						{
							type: DaiaMessageType.PUBLIC_IDENTITY_RESPONSE,
							publicKey: this.context.publicKey,
						},
						DaiaLanggraphMachineStatus.CONVERSING,
					);
				}
			} else {
				if (msg && msg.type === DaiaMessageType.PUBLIC_IDENTITY_REQUEST) {
					throw new Error(`Can't request public identity in machine state: ${this.status}`);
				}
			}

			return null;
		};

	private readonly handleInputRun = async (): Promise<DaiaStateMachineOutput> => {
		{
			const res = await this.runHandlePublicIdentityResponse();
			if (res) return res;
		}

		const msg = this.readDaiaMessage();

		if (
			this.status === DaiaLanggraphMachineStatus.INIT ||
			this.status === DaiaLanggraphMachineStatus.CONVERSING
		) {
			if (this.remoteIdentity) {
				if (msg && msg.type !== DaiaMessageType.OFFER) {
					throw new Error(`Invalid message type received in state ${this.status} : ${msg.type}`);
				} else if (msg && msg.type === DaiaMessageType.OFFER) {
					return this.makeOutputWithStatus(
						DaiaStateMachineTargetNode.OFFER_RECEIVED,
						DaiaLanggraphMachineStatus.RECEIVED_OFFER,
						(draft) => {
							draft.output.remoteOffer = msg.content;
						},
					);
				} else {
					return this.makeOutputWithStatus(
						DaiaStateMachineTargetNode.CONTINUE_CONVERSING,
						DaiaLanggraphMachineStatus.CONVERSING,
					);
				}
			} else {
				// We've received an offer message (no other is valid in this state and request should be intercepted already)
				// We can't request public identity when there's a message.
				// However we can't validate it either.
				//
				// This is non-standard behavior, so just throw here.
				if (msg) {
					throw new Error(`Invalid message type received in state ${this.status} : ${msg.type}`);
				}

				return this.makeSendDaiaOutput(
					{
						type: DaiaMessageType.PUBLIC_IDENTITY_REQUEST,
					},
					DaiaLanggraphMachineStatus.AWAITING_PUBLIC_ID_RESPONSE,
				);
			}
		} else if (this.status === DaiaLanggraphMachineStatus.AWAITING_PUBLIC_ID_RESPONSE) {
			if (!msg || msg.type !== DaiaMessageType.PUBLIC_IDENTITY_RESPONSE) {
				throw new Error(
					`Received invalid message type as public identity response: ${msg?.type?.toString()}`,
				);
			}

			// TODO(teawithsand): public key validation here or make it a better type than string here or use zod for this purpose

			return this.makeOutputWithStatus(
				DaiaStateMachineTargetNode.PUBLIC_IDENTITY_RECEIVED,
				DaiaLanggraphMachineStatus.CONVERSING,
				(draft) => {
					draft.inner.publicIdentity = {
						publicKey: msg.publicKey,
					};
				},
			);
		} else if (this.status === DaiaLanggraphMachineStatus.AWAITING_REMOTE_OFFER_RESPONSE) {
			if (!msg || msg.type !== DaiaMessageType.OFFER_RESPONSE) {
				throw new Error(
					`Invalid message type was received after our offer was sent: ${msg?.type?.toString()}`,
				);
			}

			return this.makeOutputWithStatus(
				DaiaStateMachineTargetNode.REMOTE_PROCESSED_OFFER,
				DaiaLanggraphMachineStatus.CONVERSING,
				(draft) => {
					if (msg.result === DaiaAgreementReferenceResult.ACCEPT) {
						draft.output.remoteResponseToLocalOffer = {
							agreementReference: msg.agreementReference,
							agreement: msg.agreement,
							result: DaiaAgreementReferenceResult.ACCEPT,
						};
					} else {
						draft.output.remoteResponseToLocalOffer = {
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: msg.rationale,
						};
					}
				},
			);
		} else {
			throw new Error(`Unreachable code: ${this.status}`);
		}
	};

	public readonly run = async (): Promise<DaiaStateMachineOutput> => {
		if (this.input.offerResponse) {
			if (this.input.methodCall) {
				throw new Error(`Can't do method call when offer response is being processed`);
			}

			if (this.status !== DaiaLanggraphMachineStatus.RECEIVED_OFFER) {
				throw new Error(`Improper state for offer response: ${this.status}`);
			}

			let response: DaiaMessage;
			if (this.input.offerResponse.result === DaiaAgreementReferenceResult.ACCEPT) {
				response = {
					type: DaiaMessageType.OFFER_RESPONSE,
					result: DaiaAgreementReferenceResult.ACCEPT,
					agreementReference: this.input.offerResponse.agreementReference,
					agreement: this.input.offerResponse.agreement,
				};
			} else if (this.input.offerResponse.result === DaiaAgreementReferenceResult.REJECT) {
				response = {
					type: DaiaMessageType.OFFER_RESPONSE,
					result: DaiaAgreementReferenceResult.REJECT,
					rationale: this.input.offerResponse.rationale,
				};
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				throw new Error(`Invalid offer response result: ${(this.input.offerResponse as any)?.result}`);
			}

			return this.makeSendDaiaOutput(response, DaiaLanggraphMachineStatus.CONVERSING);
		} else if (this.input.methodCall) {
			if (this.input.offerResponse) {
				throw new Error(`Can't do offer response when method is being called`);
			}

			if (
				this.status !== DaiaLanggraphMachineStatus.INIT &&
				this.status !== DaiaLanggraphMachineStatus.CONVERSING
			) {
				throw new Error(`Improper status for method call`);
			}

			if (this.input.methodCall.methodId === DaiaLanggraphMethodId.SEND_OFFER) {
				return this.makeSendDaiaOutput(
					{
						type: DaiaMessageType.OFFER,
						content: this.input.methodCall?.offer,
					},
					DaiaLanggraphMachineStatus.AWAITING_REMOTE_OFFER_RESPONSE,
				);
			} else {
				throw new Error(`Unknown daia method call id :${this.input.methodCall.methodId}`);
			}
		} else {
			return await this.handleInputRun();
		}
	};
}
