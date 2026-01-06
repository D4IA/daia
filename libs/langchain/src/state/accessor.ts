import { DaiaTransferOfferContent } from "@d4ia/core";
import { DaiaLanggraphMachineStatus } from "./innerState";
import { DaiaLanggraphNamespacedState, DaiaLanggraphState } from "./state";

export class DaiaLanggraphStateAccessor {
	public static readonly fromState = (state: DaiaLanggraphState) =>
		new DaiaLanggraphStateAccessor(state);
	public static readonly fromNamespacedState = (state: DaiaLanggraphNamespacedState) =>
		new DaiaLanggraphStateAccessor(state.daia);

	private constructor(private readonly state: DaiaLanggraphState) {}

	/**
	 * Input that was supplied to DAIA. It should be updated using writer each time some new input is received.
	 */
	public readonly getInput = () => this.state.input.text;

	/**
	 * Output that DAIA requests to be sent after executing, if there's any.
	 */
	public readonly getOutput = () => this.state.output.text;

	/**
	 * Contains offer content received from remote party. Null if there isn't any right now.
	 */
	public readonly getOffer = (): DaiaTransferOfferContent | null => this.state.output.remoteOffer;

	/**
	 * Contains response to offer sent by local agent, if there was any.
	 */
	public readonly getOfferResponse = () => this.state.output.remoteResponseToLocalOffer;

	/**
	 * Remote agent's public key, if one was received.
	 */
	public readonly remotePublicKey = (): string | null =>
		this.state.inner.publicIdentity?.publicKey ?? null;

	/**
	 * When true, it signals that agent can call some of DAIA langgraph methods.
	 */
	public readonly canCallMethod = (): boolean => {
		return (
			this.state.input.methodCall === null &&
			this.state.inner.status === DaiaLanggraphMachineStatus.CONVERSING
		);
	};

	/**
	 * Determines whether DAIA managed to exchange all the required information with the remote agent. Only after this is true,
	 * offers may be sent or received.
	 */
	public readonly isDaiaReady = (): boolean =>
		this.state.inner.publicIdentity !== null &&
		this.state.inner.status !== DaiaLanggraphMachineStatus.INIT &&
		this.state.inner.status !== DaiaLanggraphMachineStatus.INIT_AWAITING_REMOTE_HELLO;
}
