import { ParkingOffer } from '../common/messages';

export interface CarControls {
	/**
	 * Saves offer, which was used to enter the parking.
	 */
	saveAcceptedEnterOffer: (offer: ParkingOffer) => void;
}
