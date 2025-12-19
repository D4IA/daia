import z from "zod/v3";

export class JsonUtils {
	private constructor() {}

	public static readonly parseNoThrow = <T extends z.Schema>(
		x: string,
		schema: T,
	): z.infer<T> | null => {
		try {
			return schema.parse(JSON.parse(x));
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (_e) {
			return null;
		}
	};
}
