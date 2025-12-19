export type DaiaSignRequirementResolution = {
	nonce: string;
	sign: string;
};

export type DaiaSignRequirementResolver = {
	createSignatureProof: (
		serializedOffer: string,
		remoteNonce: string,
		pubKey: string,
	) => Promise<DaiaSignRequirementResolution | null>;
};
