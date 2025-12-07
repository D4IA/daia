export class CarAgentMemory {
	private _isParked: boolean = false;
	private agreementContent: string | null = null;
	private agreementReference: string | null = null;
	private parkTime: Date | null = null;

	get isParked(): boolean {
		return this._isParked;
	}

	getParkAgreement(): {
		content: string;
		reference: string;
		parkTime: Date;
	} | null {
		if (!this._isParked || !this.agreementContent || !this.agreementReference || !this.parkTime) {
			return null;
		}
		return {
			content: this.agreementContent,
			reference: this.agreementReference,
			parkTime: this.parkTime,
		};
	}

	park(agreementContent: string, agreementReference: string, parkTime: Date): void {
		this._isParked = true;
		this.agreementContent = agreementContent;
		this.agreementReference = agreementReference;
		this.parkTime = parkTime;
	}

	clearState(): void {
		this._isParked = false;
		this.agreementContent = null;
		this.agreementReference = null;
		this.parkTime = null;
	}
}
