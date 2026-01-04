import z from "zod/v3";

export enum DaiaLanggraphMachineStatus {
	INIT = "init",
	INIT_AWAITING_REMOTE_HELLO = "awaiting-remote-hello",
	CONVERSING = "conversing",
	AWAITING_OFFER_RESPONSE = "awaiting-remote-offer-response",
	RECEIVED_OFFER = "received-offer",
}

export const DaiaLanggraphInnerRemotePublicIdentity = z.object({
	publicKey: z.string(),
});

export const DaiaLanggraphInnerStateSchema = z.object({
	status: z.nativeEnum(DaiaLanggraphMachineStatus),
	publicIdentity: z.union([z.null(), DaiaLanggraphInnerRemotePublicIdentity]),
});
