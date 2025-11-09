import { daiaMock } from "../daia";

export class CarAgent {
  constructor(public id: string) {}

  async negotiate(gateOffer: any) {
    console.log("CarAgent: received offer", gateOffer);
    if (gateOffer.pricePerHour <= 10) {
      console.log("CarAgent: Accepting offer...");
      const tx = await daiaMock.blockchain.storeAgreement(gateOffer);
      return { accepted: true, txId: tx.txId };
    } else {
      console.log("CarAgent: Rejecting offer (too expensive)");
      return { accepted: false };
    }
  }

  async pay(gateId: string, amount: number) {
    await daiaMock.payments.transfer(this.id, gateId, amount);
  }
}
