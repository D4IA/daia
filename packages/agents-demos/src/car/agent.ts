import { AgentResponse } from "../common/agentInterfaces";
import { CarAgentAdapter } from "./adapter";
import { DefaultCarAgentAdapter } from "./adapterImpl";
import { CarAgentConfig as CarEnterAgentConfig } from "./config";
import { createCarAgentGraph } from "./graph";
import { CarEnterAgentState, initialCarEnterAgentState } from "./state";

export class CarEnterAgent {
	private graph: ReturnType<typeof createCarAgentGraph>["compile"] extends () => infer R ? R : never;
	private state: CarEnterAgentState;
	private adapter: CarAgentAdapter;

	constructor(config: CarEnterAgentConfig) {
		this.adapter = new DefaultCarAgentAdapter(config);
		const graphBuilder = createCarAgentGraph(this.adapter);
		this.graph = graphBuilder.compile();
		this.state = { ...initialCarEnterAgentState };
	}

	public readonly processInput = async (input: string): Promise<AgentResponse> => {
		this.state.input = input;
		this.state = (await this.graph.invoke(this.state)) as CarEnterAgentState;
		return {
			type: "message",
			content: this.state.output,
		};
	};

	public readonly getState = (): Readonly<CarEnterAgentState> => {
		return this.state;
	};
}
