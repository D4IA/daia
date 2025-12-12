import { OfferSignatureProvider } from "../defines";

export type SecretKey = {
	/** Public key corresponding to this secret key. */
	publicKey: string;
	/** Signs provided data and returns a signature string. */
	sign: (dataToSign: string) => Promise<string>;
};

/**
 * Offer signer that can sign using a provided set of secret keys.
 */
export class KeysetOfferSigner implements Pick<OfferSignatureProvider, "signForPublicKey"> {
	constructor(private readonly keys: SecretKey[]) {}

	public readonly signForPublicKey = async (
		publicKey: string,
		dataToSign: string,
	): Promise<string> => {
		const key = this.keys.find((k) => k.publicKey === publicKey);
		if (!key) {
			throw new Error(`No secret key available for public key ${publicKey}`);
		}
		return key.sign(dataToSign);
	};
}
