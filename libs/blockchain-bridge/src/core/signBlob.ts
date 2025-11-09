import { PrivateKey } from "@bsv/sdk";

/**
 * Signs a blob with a private key.
 * @param blobOrArrayBuffer The blob or array buffer to sign.
 * @param privateKeyWif The private key in WIF format.
 * @returns The signature as a string in base64 format.
 */
export const signBlob = async (
  blobOrArrayBuffer: Blob | ArrayBuffer,
  privateKeyWif: string
) => {
  let arrayBuffer: ArrayBuffer;

  const privKey = PrivateKey.fromWif(privateKeyWif);
  if (blobOrArrayBuffer instanceof Blob) {
    arrayBuffer = await blobOrArrayBuffer.arrayBuffer();
  } else {
    arrayBuffer = blobOrArrayBuffer;
  }

  const byteArray = Array.from(new Uint8Array(arrayBuffer));

  const signature = privKey.sign(byteArray);
  return signature.toDER("base64");
};
