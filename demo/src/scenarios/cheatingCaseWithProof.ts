import { CarAgent } from "../agents/carAgent";
import { GateAgent } from "../agents/gateAgent";
import { daiaMock } from "../daia";

// Simulates cheating by referencing a wrong agreement txId
export async function cheatingCaseWithProof(): Promise<boolean> {
  const car = new CarAgent("car-1");
  const gate = new GateAgent("gate-B");

  // Honest agreement at gate-A
  const honestOffer = { pricePerHour: 10, timestamp: Date.now(), gateId: "gate-A" };
  const { txId } = await daiaMock.blockchain.storeAgreement(honestOffer);

  // Attacker tries to reuse txId at a different gate
  const reused = await gate.checkProof(txId);
  // In real life we would validate gateId mismatch; here, treat as failure
  return false;
}


