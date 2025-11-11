import { ParkingOffer } from '../common/messages';

export interface CarEntryInfo {
	offer: ParkingOffer;
	entryTime: Date;
}

export interface GateParkingOfferWithMetadata {
	offerData: ParkingOffer;
	entryTime: Date;
}

export interface GateControls {
	readRegistrationPlateEnterSide(): string;
	readRegistrationPlateExitSide(): string;

	letCarEnter(): void;
	letCarExit(): void;
	signalCarToLeave(): void;
	registerCarEntry(
		licensePlate: string,
		offer: ParkingOffer,
		timestamp: Date,
	): void;
	removeCarEntry(licensePlate: string): void;
	readCarEntryInfo(licensePlate: string): CarEntryInfo | null;
	readOfferAndEntryTime(
		licensePlate: string,
	): GateParkingOfferWithMetadata | null;
}
