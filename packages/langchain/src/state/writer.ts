import { produce } from "immer";
import { DaiaLanggraphState } from "./state";
import { DaiaLanggraphMethodCall } from "./input";

export class DaiaLanggraphStateWriter {
	public static readonly fromState = (state: DaiaLanggraphState) =>
		new DaiaLanggraphStateWriter(state);

	private constructor(private state: DaiaLanggraphState) {}

	public readonly setInput = (input: string) => {
		this.state = produce(this.state, (draft) => {
			draft.input.text = input;
		});
	};

	public readonly setMethodCall = (input: DaiaLanggraphMethodCall | null) => {
		this.state = produce(this.state, (draft) => {
			draft.input.methodCall = input;
		});
	};
}
