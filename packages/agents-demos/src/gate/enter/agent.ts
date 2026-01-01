import { AgentResponse } from "../../common/agentInterfaces";
import { GateAgentEnterAdapter } from "./adapter";
import { createGateAgentGraph } from "./graph";
import { GateEnterAgentState, initialGateEnterAgentState } from "./state";

export class GateAgent {
	private graph: ReturnType<typeof createGateAgentGraph>["compile"] extends () => infer R ? R : never;
	private state: GateEnterAgentState;
	private adapter: GateAgentEnterAdapter;

	constructor(adapter: GateAgentEnterAdapter) {
		this.adapter = adapter;
		const graphBuilder = createGateAgentGraph(this.adapter);
		this.graph = graphBuilder.compile();
		this.state = { ...initialGateEnterAgentState };
	}

	public readonly processInput = async (input: string): Promise<AgentResponse> => {
		this.state.input = input;
		this.state = (await this.graph.invoke(this.state)) as GateEnterAgentState;

		const output = this.state.output

		if (output.type === "response") {
			return {
				type: "message",
				content: output.response,
			};
		} else if (output.type === "accept-client") {
			return {
				type: "end"
			};
		} else if (output.type === "reject-client") {
			return {
				type: "end"
			};
		} else {
			throw new Error("Unreachable: Unknown output type");
		}
	};

	public readonly getState = (): Readonly<GateEnterAgentState> => {
		return this.state;
	};
}
