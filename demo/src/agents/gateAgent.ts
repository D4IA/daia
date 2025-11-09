import { daiaMock } from "../daia";

export class GateAgent {
  constructor(public id: string) {}

  async offerParking() {
    const offer = { pricePerHour: 10, timestamp: Date.now() };
    console.log("GateAgent: offering", offer);
    return offer;
  }

  async checkProof(txId: string) {
    const data = await daiaMock.blockchain.readAgreement(txId);
    console.log("GateAgent: found agreement:", data);
    return data;
  }
}
