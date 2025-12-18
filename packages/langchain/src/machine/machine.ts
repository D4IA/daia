import { DaiaLanggraphState } from "../state";
import { DaiaStateMachineCall } from "./machineCall";
import { DaiaStateMachineOutput } from "./machineDefines";

// Here goes any configuration
export type DaiaStateMachineConfig = {
    /**
     * Public key for this state machine to send when it requests one.
     */
	publicKey: string;
};

export class DaiaStateMachine {
	constructor(private readonly config: DaiaStateMachineConfig) {}

    public readonly run = async (
		state: Readonly<DaiaLanggraphState>,
	): Promise<DaiaStateMachineOutput> => {
		const handler = new DaiaStateMachineCall(state, this.config);
		return await handler.run();
	};
}
