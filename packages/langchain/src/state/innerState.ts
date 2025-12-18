import z from "zod/v3";

export enum DaiaLanggraphMachineStatus {
	INIT = "init",
	CONVERSING = "conversing",
	AWAITING_PUBLIC_ID_RESPONSE = "awaiting-public-id-response",
	AWAITING_REMOTE_OFFER_RESPONSE = "awaiting-remote-offer-response",
	RECEIVED_OFFER = "received-offer",
}

export const DaiaLanggraphInnerRemotePublicIdentity = z.object({
	publicKey: z.string(),
});

export const DaiaLanggraphInnerStateSchema = z.object({
	status: z.nativeEnum(DaiaLanggraphMachineStatus),
	publicIdentity: z.union([z.null(), DaiaLanggraphInnerRemotePublicIdentity]),
});
