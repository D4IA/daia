/**
 * DAIA Transaction Logger
 * 
 * Logs DAIA agreements, signatures, and transaction details.
 * Prepares data for future blockchain publication.
 */

import type { DaiaAgreement, DaiaOfferContent } from "@d4ia/proto";
import { DaiaRequirementType } from "@d4ia/proto";

export interface AgreementLogData {
  agreement: DaiaAgreement;
  offer: DaiaOfferContent;
  timestamp: Date;
  parties: {
    offerer: string; // public key
    signee: string; // public key
  };
}

/**
 * Log the contents of a DAIA agreement with all signatures
 */
export function logAgreementDetails(
  agentId: string,
  agreement: DaiaAgreement,
  offer?: DaiaOfferContent
): void {
  console.log();
  console.log("=".repeat(70));
  console.log(`📜 DAIA AGREEMENT DETAILS [${agentId}]`);
  console.log("=".repeat(70));
  
  // Log offer content
  console.log("\n📋 Offer Content:");
  console.log(`   Serialized: ${agreement.offerContentSerialized.substring(0, 100)}...`);
  
  if (offer) {
    console.log(`   Description: ${offer.naturalLanguageOfferContent}`);
    console.log(`   Requirements: ${offer.requirements.size}`);
  }
  
  // Log all proofs/signatures
  console.log("\n✍️  Proofs & Signatures:");
  console.log(`   Total Proofs: ${agreement.proofs.size}`);
  
  for (const [requirementId, proof] of agreement.proofs.entries()) {
    console.log(`\n   Requirement: ${requirementId}`);
    console.log(`   Type: ${proof.type}`);
    
    if (proof.type === DaiaRequirementType.Sign) {
      console.log(`   Signee Nonce: ${proof.signeeNonce}`);
      console.log(`   Signature (DER hex):`);
      console.log(`      ${proof.signature}`);
      console.log(`   Signature Length: ${proof.signature.length} characters`);
    } else if (proof.type === DaiaRequirementType.Payment) {
      console.log(`   To: ${proof.to}`);
      console.log(`   Transaction ID: ${proof.txId || "(self-paid)"}`);
    }
  }
  
  console.log();
  console.log("=".repeat(70));
  console.log();
}

/**
 * Prepare agreement data for blockchain publication
 * Returns serialized data ready to be included in OP_RETURN or similar
 */
export function prepareForBlockchain(agreement: DaiaAgreement): {
  serialized: string;
  size: number;
  chunks?: string[]; // If data needs to be chunked
} {
  const serializable = {
    offerContentSerialized: agreement.offerContentSerialized,
    proofs: Object.fromEntries(agreement.proofs || new Map()),
  };
  
  const serialized = JSON.stringify(serializable);
  const size = Buffer.byteLength(serialized, 'utf8');
  
  // BSV OP_RETURN limit is ~100KB per output, but we might want smaller chunks
  const MAX_CHUNK_SIZE = 90000; // bytes, leaving some room
  
  let chunks: string[] | undefined;
  if (size > MAX_CHUNK_SIZE) {
    chunks = [];
    for (let i = 0; i < serialized.length; i += MAX_CHUNK_SIZE) {
      chunks.push(serialized.slice(i, i + MAX_CHUNK_SIZE));
    }
  }
  
  console.log(`\n📦 Blockchain Preparation:`);
  console.log(`   Serialized Size: ${size} bytes`);
  console.log(`   Chunks Needed: ${chunks ? chunks.length : 1}`);
  console.log(`   Ready for Publication: ${size <= MAX_CHUNK_SIZE ? "✅ Yes" : "⚠️  Needs chunking"}`);
  
  return {
    serialized,
    size,
    chunks,
  };
}

/**
 * Log that an agreement is ready to be pushed to blockchain
 */
export function logBlockchainReadiness(
  agentId: string,
  txData: ReturnType<typeof prepareForBlockchain>
): void {
  console.log();
  console.log("⛓️  BLOCKCHAIN PUBLICATION STATUS");
  console.log(`   Agent: ${agentId}`);
  console.log(`   Data Size: ${txData.size} bytes`);
  console.log(`   Status: Ready for transaction creation`);
  console.log(`   Next Step: Create BSV transaction with OP_RETURN data`);
  console.log();
}
