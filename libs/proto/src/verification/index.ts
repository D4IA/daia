// Verification components
export { AgreementVerifier } from "./AgreementVerifier";
export { OfferSigner, type PaymentMap, type SigningResult } from "./OfferSigner";

// Serialization utilities
export { serializeOfferContent, deserializeOfferContent } from "./serialization";

// Adapters
export type {
  IBlockchainAdapter,
  ISignatureVerifier,
  ISignatureSigner,
  ISigningResourcesAdapter,
  PaymentVerification,
} from "./adapters";

// Concrete implementations
export { BsvSignatureAdapter, BsvSignatureVerifier, BsvSignatureSigner } from "./BsvSignatureAdapter";
export { WhatsOnChainAdapter, type WhatsOnChainNetwork } from "./WhatsOnChainAdapter";

// Errors
export {
  VerificationFailedError,
  type VerificationError,
  type VerificationErrorType,
} from "./errors";
