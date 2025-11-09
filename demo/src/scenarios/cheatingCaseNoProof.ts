import { CarAgent } from "../agents/carAgent";
import { GateAgent } from "../agents/gateAgent";

// Simulates cheating by skipping agreement/proof entirely
export async function cheatingCaseNoProof(): Promise<boolean> {
  const car = new CarAgent("car-1");
  const gate = new GateAgent("gate-A");

  await gate.offerParking();
  // Car does not accept or store any agreement, attempts to pay anyway
  await car.pay(gate.id, 10);

  // In this simplified mock, consider this a failure (no stored agreement)
  return false;
}


