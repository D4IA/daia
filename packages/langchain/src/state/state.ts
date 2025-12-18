import z from "zod/v3";
import { DaiaLanggraphStateInput } from "./input";
import { DaiaLanggraphStateOutput } from "./output";
import { DaiaLanggraphInnerStateSchema } from "./innerState";

export const DaiaLanggraphStateSchema = z.object({
	input: DaiaLanggraphStateInput,
	inner: DaiaLanggraphInnerStateSchema,
	output: DaiaLanggraphStateOutput,
});

export type DaiaLanggraphState = z.infer<typeof DaiaLanggraphStateSchema>;

export const DaiaLanggraphNamespacedStateSchema = z.object({
	daia: DaiaLanggraphStateSchema,
});

export type DaiaLanggraphNamespacedState = z.infer<typeof DaiaLanggraphNamespacedStateSchema>;
