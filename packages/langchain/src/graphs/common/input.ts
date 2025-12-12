import z from "zod/v3"
import { produce } from "immer"
import { DaiaStateNamespaced, DaiaStateUpdateNamespaced } from "../../state"

export const DaiaInputStateSchema = z.object({
    inputText: z.string()
})

export type DaiaInputState = z.infer<typeof DaiaInputStateSchema>

export const defaultInputState: DaiaInputState = {
	inputText: "",
}

export class DaiaInputStateAccessor {
    constructor(
        private readonly input: Readonly<DaiaStateNamespaced>
    ) { }

    /**
     * Writes current session input text to DAIA state to make it accessible to DAIA.
     */
    public readonly writeInputText = (text: string): DaiaStateUpdateNamespaced => {
        const updatedInput = produce(this.input.daia.input, (draft) => {
            draft.inputText = text
        })

        return {
            daia: {
                input: updatedInput,
            },
        }
    }
}