import { PublicKey, Signature } from "@bsv/sdk";
import { SignatureValidator, SignatureVerifyParams } from "./defines";

export class BsvSignatureValidator implements SignatureValidator {
	public async verifySignature(params: SignatureVerifyParams): Promise<boolean> {
		const { pubKey, message, signature } = params;
		const pub = (() => {
			try {
				return PublicKey.fromString(pubKey);
			} catch (err) {
				return null;
			}
		})();

		if (!pub) return false;

		const sig = (() => {
			try {
				return Signature.fromDER(signature, "hex");
			} catch (err) {
				return null;
			}
		})();

		if (!sig) return false;

		return pub.verify(message, sig, "utf8");
	}
}
