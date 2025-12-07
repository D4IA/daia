import { AgentResponse } from "../../common/agentInterfaces";
import { GateAgentExitAdapter } from "./adapter";
import { createGateExitAgentGraph } from "./graph";
import { GateExitAgentState, initialGateExitAgentState } from "./state";

export class GateExitAgent {
	private graph: ReturnType<typeof createGateExitAgentGraph>["compile"] extends () => infer R
		? R
		: never;
	private state: GateExitAgentState;
	private adapter: GateAgentExitAdapter;

	constructor(adapter: GateAgentExitAdapter) {
		this.adapter = adapter;
		const graphBuilder = createGateExitAgentGraph(this.adapter);
		this.graph = graphBuilder.compile();
		this.state = { ...initialGateExitAgentState };
	}

	public readonly processInput = async (input: string): Promise<AgentResponse> => {
		this.state.input = input;
		this.state = (await this.graph.invoke(this.state)) as GateExitAgentState;

		const output = this.state.output;

		if (output.type === "response") {
			return {
				type: "message",
				content: output.response,
			};
		} else if (output.type === "accept-client") {
			return {
				type: "end",
			};
		} else if (output.type === "reject-client") {
			return {
				type: "end",
			};
		} else {
			throw new Error("Unreachable: Unknown output type");
		}
	};

	public readonly getState = (): Readonly<GateExitAgentState> => {
		return this.state;
	};
}
