import { PrivateKey } from "@d4ia/blockchain-bridge";
import { DaiaSignRequirementResolution, DaiaSignRequirementResolver } from "./signResolver";

export class DefaultDaiaSignRequirementResolver implements DaiaSignRequirementResolver {
	constructor(private readonly privateKey: PrivateKey) {}

	createSignatureProof = async (
		serializedInnerOffer: string,
		remoteNonce: string,
		pubKey: string,
	): Promise<DaiaSignRequirementResolution | null> => {
		// Verify that the provided pubKey matches our private key
		const ourPubKey = this.privateKey.toPublicKey().toString();
		if (ourPubKey !== pubKey) {
			throw new Error(`Public key mismatch: expected ${pubKey}, got ${ourPubKey}`);
		}

		// Generate a new nonce for the signee using Web Crypto API
		const randomValues = new Uint8Array(32);
		crypto.getRandomValues(randomValues);
		const signeeNonce = Array.from(randomValues)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		// Create the message to sign: offererNonce + signeeNonce + serializedOffer
		// Note: remoteNonce here is the offererNonce from the verifier's perspective
		const messageToSign = remoteNonce + signeeNonce + serializedInnerOffer;

		// Sign the message
		const signature = this.privateKey.sign(messageToSign);

		// Convert signature to DER format in base64
		const signatureDER = signature.toDER("base64");

		return {
			nonce: signeeNonce,
			sign:
				typeof signatureDER === "string" ? signatureDER : btoa(String.fromCharCode(...signatureDER)),
		};
	};
}
