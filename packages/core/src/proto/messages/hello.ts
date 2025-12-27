import z from "zod/v3";
import { DaiaMessageType } from "./common";

export const DaiaHelloSchema = z.object({
	type: z.literal(DaiaMessageType.DAIA_HELLO),
	publicKey: z.string(),
});

export type DaiaHello = z.infer<typeof DaiaHelloSchema>;
