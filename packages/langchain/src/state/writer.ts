import { produce } from "immer";
import {
	DaiaLanggraphMethodCall,
	DaiaLanggraphMethodId,
	DaiaLanggraphOfferResponse,
} from "./input";
import { DaiaLanggraphState, makeInitialDaiaLanggraphState } from "./state";
import { DaiaOfferContent } from "@daia/core";

export class DaiaLanggraphStateWriter {
	public static readonly fromState = (state: DaiaLanggraphState) =>
		new DaiaLanggraphStateWriter(state);

	private constructor(private state: DaiaLanggraphState) {}

	public static readonly initialState = () => {
		return makeInitialDaiaLanggraphState();
	};

	public static readonly fromInitialState = () => {
		return DaiaLanggraphStateWriter.fromState(DaiaLanggraphStateWriter.initialState());
	};

	public readonly setInput = (input: string) => {
		this.state = produce(this.state, (draft) => {
			draft.input = {
				text: input,
				methodCall: null,
				offerResponse: null,
			};
		});

		return this;
	};

	public readonly clear = () => {
		this.state = produce(this.state, (draft) => {
			draft.input = {
				text: "",
				methodCall: null,
				offerResponse: null,
			};
		});
		return this;
	};

	public readonly setMethodCall = (input: DaiaLanggraphMethodCall | null) => {
		this.state = produce(this.state, (draft) => {
			draft.input.methodCall = input;
		});

		return this;
	};

	public readonly proposeOffer = (input: DaiaOfferContent): this => {
		return this.setMethodCall({
			methodId: DaiaLanggraphMethodId.SEND_OFFER,
			offer: input,
		});
	};

	public readonly setOfferResponse = (input: DaiaLanggraphOfferResponse | null) => {
		this.state = produce(this.state, (draft) => {
			draft.input.offerResponse = input;
		});

		return this;
	};

	public readonly build = () => {
		return this.state;
	};
}
