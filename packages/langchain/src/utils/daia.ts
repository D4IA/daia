import { DaiaMessageSchema, DaiaMessage } from "../messages";

export class DaiaMessageUtils {
	private constructor() { }

	public static readonly PREFIX = "DAIA://";

	public static readonly isDaiaMessage = (text: string): boolean => {
		return text.startsWith(DaiaMessageUtils.PREFIX);
	};

	public static readonly stripPrefix = (text: string): string => {
		return DaiaMessageUtils.isDaiaMessage(text)
			? text.slice(DaiaMessageUtils.PREFIX.length)
			: text;
	};

	public static readonly addPrefix = (text: string): string => {
		return DaiaMessageUtils.isDaiaMessage(text)
			? text
			: `${DaiaMessageUtils.PREFIX}${text}`;
	};

	/**
	 * Parse a DAIA message from text. Throws if parsing fails.
	 * Automatically strips the DAIA:// prefix if present and converts objects to Maps.
	 * @param text - Text with or without DAIA:// prefix
	 * @returns Parsed and validated DaiaMessage object
	 * @throws ZodError if the message format is invalid
	 */
	public static readonly parse = (text: string): DaiaMessage => {
		const stripped = DaiaMessageUtils.stripPrefix(text);
		const parsed = JSON.parse(stripped);
		// Convert requirements object to Map for offer messages
		if (parsed?.type === "offer" && parsed?.content?.requirements) {
			parsed.content.requirements = new Map(Object.entries(parsed.content.requirements));
		}
		return DaiaMessageSchema.parse(parsed);
	};

	/**
	 * Safely parse a DAIA message from text. Returns null if parsing fails.
	 * Automatically strips the DAIA:// prefix if present and converts objects to Maps.
	 * @param text - Text with or without DAIA:// prefix
	 * @returns Parsed DaiaMessage object or null if invalid
	 */
	public static readonly safeParse = (text: string): DaiaMessage | null => {
		try {
			const stripped = DaiaMessageUtils.stripPrefix(text);
			const parsed = JSON.parse(stripped);
			// Convert requirements object to Map for offer messages
			if (parsed?.type === "offer" && parsed?.content?.requirements) {
				parsed.content.requirements = new Map(Object.entries(parsed.content.requirements));
			}
			const result = DaiaMessageSchema.safeParse(parsed);
			return result.success ? result.data : null;
		} catch {
			return null;
		}
	};

	/**
	 * Serialize a DaiaMessage object to a JSON string with the DAIA:// prefix.
	 * Converts Maps to objects for JSON compatibility.
	 * @param message - DaiaMessage object to serialize
	 * @returns JSON string with DAIA:// prefix
	 */
	public static readonly serialize = (message: DaiaMessage): string => {
		const json = JSON.stringify(message, (key, value) => {
			// Convert Map to plain object for JSON serialization
			if (value instanceof Map) {
				return Object.fromEntries(value);
			}
			return value;
		});
		return DaiaMessageUtils.addPrefix(json);
	};
}
