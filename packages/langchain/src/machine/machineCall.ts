import {
	DaiaAgreementReferenceResult,
	DaiaMessage,
	DaiaMessageType,
	DaiaMessageUtil,
	DaiaOfferContent,
} from "@daia/core";
import { Draft, produce } from "immer";
import { DaiaLanggraphMethodCall, DaiaLanggraphMethodId, DaiaLanggraphState } from "../state";
import { DaiaLanggraphMachineStatus } from "../state/innerState";
import { DaiaStateMachineConfig } from "./machine";
import { DaiaLanggraphStateMachineOutput, DaiaLanggraphMachineNode } from "./machineDefines";

export class DaiaLanggraphStateMachineCall {
	private cachedMessage: DaiaMessage | null | undefined = undefined;
	constructor(
		private readonly state: Readonly<DaiaLanggraphState>,
		private readonly config: DaiaStateMachineConfig,
	) {}

	private get input() {
		return this.state.input;
	}

	private get status() {
		return this.state.inner.status;
	}

	private readonly clearOutput = (draft: Draft<DaiaLanggraphState>) => {
		draft.output = {
			remoteOffer: null,
			remoteResponseToLocalOffer: null,
			text: "",
		};
	};

	private readonly makeOutput = (
		target: DaiaLanggraphMachineNode,
		producer?: (draft: Draft<DaiaLanggraphState>) => DaiaLanggraphState | void,
	): DaiaLanggraphStateMachineOutput => {
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
		target: DaiaLanggraphMachineNode,
		status: DaiaLanggraphMachineStatus,
		producer?: (draft: Draft<DaiaLanggraphState>) => DaiaLanggraphState | void,
	): DaiaLanggraphStateMachineOutput => {
		return this.makeOutput(target, (draft) => {
			if (status) {
				draft.inner.status = status;
			}
			if (producer) {
				return producer(draft);
			}
		});
	};

	private readonly makeSendDaiaOutput = (
		msg: DaiaMessage,
		status: DaiaLanggraphMachineStatus,
		producer?: (draft: Draft<DaiaLanggraphState>) => DaiaLanggraphState | void,
	) => {
		return this.makeOutput(DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT, (draft) => {
			draft.output.text = DaiaMessageUtil.serialize(msg);
			if (status) {
				draft.inner.status = status;
			}
			if (producer) {
				return producer(draft);
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

	private readonly readDaiaMethodCall = (): DaiaLanggraphMethodCall | null => {
		return this.input.methodCall;
	};

	private readonly handleInitStatus = async (): Promise<DaiaLanggraphStateMachineOutput> => {
		const msg = this.readDaiaMessage();
		const call = this.readDaiaMethodCall();

		if (call) {
			throw new Error(
				`Can't call method ${call.methodId} in state ${DaiaLanggraphMachineStatus.INIT}`,
			);
		}

		if (msg === null && this.input.text === "") {
			return this.makeSendDaiaOutput(
				{
					type: DaiaMessageType.DAIA_HELLO,
					publicKey: this.config.publicKey,
				},
				DaiaLanggraphMachineStatus.INIT_AWAITING_REMOTE_HELLO,
			);
		} else if (msg === null) {
			return this.makeOutputWithStatus(
				DaiaLanggraphMachineNode.CONTINUE_CONVERSING,
				DaiaLanggraphMachineStatus.INIT,
			);
		} else if (msg.type === DaiaMessageType.DAIA_HELLO) {
			return this.makeSendDaiaOutput(
				{
					type: DaiaMessageType.DAIA_HELLO,
					publicKey: this.config.publicKey,
				},
				DaiaLanggraphMachineStatus.CONVERSING,
				(draft) => {
					draft.inner.publicIdentity = {
						publicKey: msg.publicKey,
					};
				},
			);
		} else {
			throw new Error(`Received invalid message type in INIT state: ${msg.type}`);
		}
	};

	private readonly handleInitAwaitingHelloStatus =
		async (): Promise<DaiaLanggraphStateMachineOutput> => {
			// This state means that we received empty string during hello phase

			const msg = this.readDaiaMessage();
			const call = this.readDaiaMethodCall();

			if (call)
				throw new Error(
					`Can't call method ${call.methodId} in state ${DaiaLanggraphMachineStatus.INIT_AWAITING_REMOTE_HELLO}`,
				);

			if (msg === null) {
				return this.makeOutputWithStatus(
					DaiaLanggraphMachineNode.CONTINUE_CONVERSING,
					DaiaLanggraphMachineStatus.INIT_AWAITING_REMOTE_HELLO,
				);
			} else if (msg.type === DaiaMessageType.DAIA_HELLO) {
				return this.makeOutputWithStatus(
					DaiaLanggraphMachineNode.CONTINUE_CONVERSING,
					DaiaLanggraphMachineStatus.CONVERSING,
					(draft) => {
						draft.inner.publicIdentity = {
							// TODO(teawithsand): public key validation here or make it a better type than string here or use zod for this purpose
							publicKey: msg.publicKey,
						};
					},
				);
			} else {
				throw new Error(`Received invalid message type in INIT state: ${msg.type}`);
			}
		};

	private readonly handleConversingStatus = async (): Promise<DaiaLanggraphStateMachineOutput> => {
		const msg = this.readDaiaMessage();
		const call = this.readDaiaMethodCall();

		if (msg && msg.type !== DaiaMessageType.OFFER) {
			throw new Error(`Invalid message type received in state ${this.status} : ${msg.type}`);
		} else if (msg && msg.type === DaiaMessageType.OFFER) {
			return this.makeOutputWithStatus(
				DaiaLanggraphMachineNode.OFFER_RECEIVED,
				DaiaLanggraphMachineStatus.RECEIVED_OFFER,
				(draft) => {
					draft.output.remoteOffer = msg.content;
				},
			);
		} else {
			// only respect method call if incoming message was not a offer request
			if (call) {
				if (call.methodId === DaiaLanggraphMethodId.SEND_OFFER) {
					return await this.handleConversingProposeOfferMethodCall(call.offer);
				} else {
					throw new Error(`Invalid daia method id: ${call.methodId}`);
				}
			}

			return this.makeOutputWithStatus(
				DaiaLanggraphMachineNode.CONTINUE_CONVERSING,
				DaiaLanggraphMachineStatus.CONVERSING,
			);
		}
	};

	private readonly handleConversingProposeOfferMethodCall = async (
		offer: DaiaOfferContent,
	): Promise<DaiaLanggraphStateMachineOutput> => {
		return this.makeSendDaiaOutput(
			{
				type: DaiaMessageType.OFFER,
				content: offer,
			},
			DaiaLanggraphMachineStatus.AWAITING_OFFER_RESPONSE,
		);
	};

	private readonly handleAwaitingOfferResponseStatus =
		async (): Promise<DaiaLanggraphStateMachineOutput> => {
			const msg = this.readDaiaMessage();
			const call = this.readDaiaMethodCall();

			if (call)
				throw new Error(
					`Can't call method ${call.methodId} in state ${DaiaLanggraphMachineStatus.AWAITING_OFFER_RESPONSE}`,
				);

			if (!msg || msg.type !== DaiaMessageType.OFFER_RESPONSE) {
				throw new Error(
					`Invalid message type was received after our offer was sent: ${msg?.type?.toString()} OR invalid DAIA message was received`,
				);
			}

			return this.makeOutputWithStatus(
				DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER,
				DaiaLanggraphMachineStatus.CONVERSING,
				(draft) => {
					if (msg.result === DaiaAgreementReferenceResult.ACCEPT) {
						// TODO(teawithsand): trigger validation here of incoming offer

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
		};

	private readonly handleReceivedOfferStatus =
		async (): Promise<DaiaLanggraphStateMachineOutput> => {
			const response = this.state.input.offerResponse;
			if (!response) throw new Error(`No offer response provided in state ${this.status}`);
			if (response.result === DaiaAgreementReferenceResult.ACCEPT) {
				// TODO(teawithsand): trigger validation here of incoming offer

				return this.makeSendDaiaOutput(
					{
						type: DaiaMessageType.OFFER_RESPONSE,
						agreementReference: response.agreementReference,
						agreement: response.agreement,
						result: DaiaAgreementReferenceResult.ACCEPT,
					},
					DaiaLanggraphMachineStatus.CONVERSING,
				);
			} else if (response.result === DaiaAgreementReferenceResult.REJECT) {
				return this.makeSendDaiaOutput(
					{
						type: DaiaMessageType.OFFER_RESPONSE,
						result: DaiaAgreementReferenceResult.REJECT,
						rationale: response.rationale,
					},
					DaiaLanggraphMachineStatus.CONVERSING,
				);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				throw new Error(`Invalid offer response result: ${(response as any).result}`);
			}
		};
	private readonly handleInputRun = async (): Promise<DaiaLanggraphStateMachineOutput> => {
		if (this.status === DaiaLanggraphMachineStatus.INIT) {
			return await this.handleInitStatus();
		} else if (this.status === DaiaLanggraphMachineStatus.INIT_AWAITING_REMOTE_HELLO) {
			return await this.handleInitAwaitingHelloStatus();
		} else if (this.status === DaiaLanggraphMachineStatus.CONVERSING) {
			return await this.handleConversingStatus();
		} else if (this.status === DaiaLanggraphMachineStatus.AWAITING_OFFER_RESPONSE) {
			return await this.handleAwaitingOfferResponseStatus();
		} else if (this.status === DaiaLanggraphMachineStatus.RECEIVED_OFFER) {
			return await this.handleReceivedOfferStatus();
		} else {
			throw new Error(`Unhandled DAIA langgraph machine status: ${this.status}`);
		}
	};

	public readonly run = async (): Promise<DaiaLanggraphStateMachineOutput> => {
		return await this.handleInputRun();
	};
}
