import { AgentResponse } from "../../common/agentInterfaces";
import { CarExitAgentAdapter } from "./adapter";
import { createCarExitAgentGraph } from "./graph";
import { CarExitAgentState, initialCarExitAgentState } from "./state";

export class CarExitAgent {
	private graph: ReturnType<typeof createCarExitAgentGraph>["compile"] extends () => infer R
		? R
		: never;
	private state: CarExitAgentState;
	private adapter: CarExitAgentAdapter;

	constructor(adapter: CarExitAgentAdapter) {
		this.adapter = adapter;
		const graphBuilder = createCarExitAgentGraph(this.adapter);
		this.graph = graphBuilder.compile();
		this.state = { ...initialCarExitAgentState };
	}

	public readonly processInput = async (input: string): Promise<AgentResponse> => {
		this.state.input = input;
		this.state = (await this.graph.invoke(this.state)) as CarExitAgentState;
		return {
			type: "message",
			content: this.state.output,
		};
	};

	public readonly getState = (): Readonly<CarExitAgentState> => {
		return this.state;
	};
}
