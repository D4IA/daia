import { Command, START, StateGraph } from "@langchain/langgraph";
import { DaiaStateMachine } from "../machine/machine";
import { DaiaStateMachineTargetNode } from "../machine/machineDefines";
import { DaiaLanggraphNamespacedStateSchema } from "../state";

/**
 * Config, which configures DAIA graph, which in turn can be used as subgraph in order to provide more features with DAIA.
 */
export type DaiaGraphConfig = {
    /**
     * Public key to send when remote DAIA agent requests public key from this agent.
     */
    publicKey: string

    /**
     * Maps node names from internal DAIA langgraph representation to actual node names used by langgraph.
     */
    mapNode: (node: DaiaStateMachineTargetNode) => string
}

export const makeDaiaGraph = (
    config: DaiaGraphConfig,
) => {
    const machine = new DaiaStateMachine({
        publicKey: config.publicKey
    })

    return new StateGraph(DaiaLanggraphNamespacedStateSchema)
        .addNode("input", async state => {
            const output = await machine.run(state.daia)

            return new Command({
                goto: config.mapNode(output.targetNode),
                graph: Command.PARENT,
                update: {
                    daia: output.newState
                }
            })
        })
        .addEdge(START, "input")
        .compile();
}