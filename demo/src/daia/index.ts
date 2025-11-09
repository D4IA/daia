import { BlockchainModule } from "./blockchain.interface";
import { PaymentsModule } from "./payments.interface";
import { ProofPlatform } from "./proof.interface";

export const daiaMock: {
  blockchain: BlockchainModule;
  payments: PaymentsModule;
  proof: ProofPlatform;
} = {
  blockchain: {
    async storeAgreement(data: any) {
      console.log("[MOCK] storing on blockchain:", data);
      return { txId: "mock-tx-" + Date.now() };
    },
    async readAgreement(txId: string) {
      console.log("[MOCK] reading blockchain data for:", txId);
      return { terms: "10 PLN/h", timestamp: Date.now() };
    },
  },

  payments: {
    async transfer(from: string, to: string, amount: number) {
      console.log(`[MOCK] Payment: ${from} → ${to}, ${amount} PLN`);
      return true;
    },
  },

  proof: {
    async submitEvidence(data: any) {
      console.log("[MOCK] Submitting evidence:", data);
      return { proofId: "proof-" + Date.now() };
    },
    async viewEvidence(proofId: string) {
      console.log("[MOCK] Viewing evidence:", proofId);
      return { status: "valid", timestamp: Date.now() };
    },
  },
};
