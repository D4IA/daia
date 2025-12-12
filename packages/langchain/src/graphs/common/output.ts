import z from "zod/v3"

export const DaiaOutputStateSchema = z.object({
    outputText: z.string()
})

export type DaiaOutputState = z.infer<typeof DaiaOutputStateSchema>

export const defaultOutputState: DaiaOutputState = {
    outputText: "",
}
