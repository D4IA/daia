import { ZodSchema } from "zod/v3"

export const safeParseJson = <T>(schema: ZodSchema<T>, text: string):
	| { success: true; data: T }
	| { success: false; error: string } => {
	let parsed: unknown
	try {
		parsed = JSON.parse(text)
	} catch (err) {
		const message = err instanceof SyntaxError ? err.message : "Invalid JSON"
		return { success: false, error: message }
	}

	const result = schema.safeParse(parsed)
	if (result.success) {
		return { success: true, data: result.data }
	}
	return { success: false, error: result.error.message }
}
