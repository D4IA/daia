import z from "zod/v3";

export * from "./common";
export * from "./hello";
export * from "./offer";
export * from "./agreementReference";
export * from "./helper";

import {
	DaiaHelloSchema,
} from "./hello";
import { DaiaOfferMessageSchema } from "./offer";
import { DaiaAgreementReferenceMessageSchema } from "./agreementReference";

export const DaiaMessageSchema = z.union([
	DaiaHelloSchema,
	DaiaOfferMessageSchema,
	DaiaAgreementReferenceMessageSchema,
]);

export type DaiaMessage = z.infer<typeof DaiaMessageSchema>;
