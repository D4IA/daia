import { PublicKey } from "@daia/blockchain"

export type CarData = {
    licensePlate: string,
    publicKey: PublicKey,
    ratePerHour: number,
    parkedAt: Date
}

export type CarsDB = {
    [licensePlate: string]: CarData
}

export type GateAgentState = {
    cars: CarsDB
}