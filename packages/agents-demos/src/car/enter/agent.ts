import { AgentResponse } from "../../common/agentInterfaces";
import { CarEnterAgentAdapter } from "./adapter";
import { DefaultCarEnterAgentAdapter } from "./adapterImpl";
import { CarEnterAgentConfig } from "./config";
import { createCarEnterAgentGraph } from "./graph";
import { CarEnterAgentState, initialCarEnterAgentState } from "./state";

export class CarEnterAgent {
	private graph: ReturnType<typeof createCarEnterAgentGraph>["compile"] extends () => infer R
		? R
		: never;
	private state: CarEnterAgentState;
	private adapter: CarEnterAgentAdapter;

	constructor(config: CarEnterAgentConfig) {
		this.adapter = new DefaultCarEnterAgentAdapter(config);
		const graphBuilder = createCarEnterAgentGraph(this.adapter);
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
