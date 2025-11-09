import { CarAgent } from "../agents/carAgent";
import { GateAgent } from "../agents/gateAgent";

export async function honestCase() {
  const car = new CarAgent("car-1");
  const gate = new GateAgent("gate-1");

  const offer = await gate.offerParking();
  const result = await car.negotiate(offer);

  if (result.accepted) {
    console.log("Parking started...");
    await car.pay(gate.id, offer.pricePerHour);
    console.log("Transaction finished successfully ✅");
  }
}
