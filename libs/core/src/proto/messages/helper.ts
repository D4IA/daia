import { DaiaMessage, DaiaMessageSchema } from ".";
import { DAIA_MESSAGE_PREFIX } from "./common";

export class DaiaMessageUtil {
	private constructor() {}

	public static readonly isDaiaMessage = (msg: string): boolean => {
		return msg.startsWith(DAIA_MESSAGE_PREFIX);
	};

	public static readonly serialize = (msg: DaiaMessage): string => {
		return DAIA_MESSAGE_PREFIX + JSON.stringify(msg);
	};

	public static readonly deserialize = (msg: string): DaiaMessage => {
		if (msg.startsWith(DAIA_MESSAGE_PREFIX)) {
			msg = msg.slice(DAIA_MESSAGE_PREFIX.length);
		}

		const msgParsed = JSON.parse(msg);

		return DaiaMessageSchema.parse(msgParsed);
	};
}
