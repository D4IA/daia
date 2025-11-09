import { PrivateKey } from "@bsv/sdk";

/**
 * Signs a blob with a private key.
 * @param blob The blob to sign.
 * @param privateKeyWif The private key in WIF format.
 * @returns The signature as a string in base64 format.
 */
export const signBlob = async (blob: Blob, privateKeyWif: string) => {
  const privKey = PrivateKey.fromWif(privateKeyWif);

  const arrayBuffer = await blob.arrayBuffer();
  const byteArray = Array.from(new Uint8Array(arrayBuffer));

  const signature = privKey.sign(byteArray);
  return signature.toDER("base64");
};
