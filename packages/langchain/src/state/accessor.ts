import { DaiaOfferContent } from "@daia/core";
import { DaiaLanggraphNamespacedState, DaiaLanggraphState } from "./state";
import { DaiaLanggraphMethodCall } from "./input";

export class DaiaLanggraphStateAccessor {
	public static readonly fromState = (state: DaiaLanggraphState) =>
		new DaiaLanggraphStateAccessor(state);
	public static readonly fromNamespacedState = (state: DaiaLanggraphNamespacedState) =>
		new DaiaLanggraphStateAccessor(state.daia);

	private constructor(private readonly state: DaiaLanggraphState) { }

	public readonly getInput = () => this.state.input.text;
	public readonly getOutput = () => this.state.output.text;
	public readonly getMethodCall = (): DaiaLanggraphMethodCall | null => this.state.input.methodCall;
	public readonly getOffer = (): DaiaOfferContent | null => this.state.output.remoteOffer;
	public readonly remotePublicKey = (): string | null => this.state.inner.publicIdentity?.publicKey ?? null
}
