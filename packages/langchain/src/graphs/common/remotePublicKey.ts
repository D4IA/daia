import z from "zod/v3"

export const DaiaRemotePublicKeyStateSchema = z.object({
    remotePublicKey: z.string()
})

export type DaiaRemotePublicKeyState = z.infer<typeof DaiaRemotePublicKeyStateSchema>

export const defaultRemotePublicKeyState: DaiaRemotePublicKeyState = {
    remotePublicKey: "",
}
