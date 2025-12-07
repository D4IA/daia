import z from "zod/v3";

export const MessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string(),
});
