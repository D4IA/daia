import { DaiaLanggraphState } from "../state";
import { DaiaLanggraphStateMachineCall } from "./machineCall";
import { DaiaLanggraphStateMachineOutput } from "./machineDefines";

// Here goes any configuration
export type DaiaStateMachineConfig = {
	/**
	 * Public key for this state machine to send when it requests one.
	 */
	publicKey: string;
};

export class DaiaLanggraphStateMachine {
	constructor(private readonly config: DaiaStateMachineConfig) {}

	public readonly run = async (
		state: Readonly<DaiaLanggraphState>,
	): Promise<DaiaLanggraphStateMachineOutput> => {
		const handler = new DaiaLanggraphStateMachineCall(state, this.config);
		return await handler.run();
	};
}
