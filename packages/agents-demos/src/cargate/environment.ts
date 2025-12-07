import { PrivateKey, BsvNetwork } from "@daia/blockchain";
import { CarAgentMemory } from "../car/db/memory";
import { CarStorage } from "./carStorage";
import { GateAgentCarsDB } from "../gate";
import { CarGateSimulationSession } from "./session";

export type CarConfiguration = {
	licensePlate: string;
	privateKey: PrivateKey;

	negotiationPrompt: string;
	negotiationModel: string;

	offerConsiderationPrompt: string;
	offerConsiderationModel: string;
};

export type GateConfiguration = {
	privateKey: PrivateKey;

	conversationPrompt: string;
	conversationModel: string;

	offerGeneratingPrompt: string;
	offerGeneratingModel: string;
};

export type CarGateSimulationEnvironmentConfig = {
	openAIApiKey: string;
	network: BsvNetwork;
	gateConfig: GateConfiguration;
	maxTurns: number;
};

export type Car = {
	config: CarConfiguration;
	memory: CarAgentMemory;
};

export type Gate = {
	privateKey: PrivateKey;
	db: GateAgentCarsDB;
};

export class CarGateSimulationEnvironment {
	private readonly cars: CarStorage = new CarStorage();
	private readonly gate: Gate;
	private readonly envConfig: CarGateSimulationEnvironmentConfig;

	constructor(envConfig: CarGateSimulationEnvironmentConfig) {
		this.envConfig = envConfig;
		this.gate = {
			privateKey: envConfig.gateConfig.privateKey,
			db: new GateAgentCarsDB(),
		};
	}

	addCar = (carConfig: CarConfiguration) => {
		if (this.cars.hasCar(carConfig.licensePlate)) {
			throw new Error(`Car with license plate ${carConfig.licensePlate} is already registered`);
		}
		const memory = new CarAgentMemory();
		const car: Car = {
			config: carConfig,
			memory: memory,
		};
		this.cars.setCar(car);
	};

	removeCar = (licensePlate: string): boolean => {
		const gateRecord = this.gate.db.getByPlate(licensePlate);
		if (gateRecord) {
			this.gate.db.remove(gateRecord.id);
		}
		return this.cars.removeCar(licensePlate);
	};

	getAllCars = (): Car[] => {
		return this.cars.getAllCars();
	};

	getGateDetailsForCar = (licensePlate: string) => {
		return this.gate.db.getByPlate(licensePlate);
	};

	getInconsistentCars = (): Car[] => {
		const allCars = this.cars.getAllCars();
		return allCars.filter((car) => {
			const carIsParked = car.memory.isParked;
			const gateHasRecord = this.gate.db.getByPlate(car.config.licensePlate) !== undefined;
			return carIsParked !== gateHasRecord;
		});
	};

	getGateConfig = (): GateConfiguration => {
		return this.envConfig.gateConfig;
	};

	getGate = (): Gate => {
		return this.gate;
	};

	/**
	 * Override the memory of a specific car.
	 * Useful for testing scenarios where a car needs pre-initialized state (e.g., already parked).
	 */
	setCarMemory = (licensePlate: string, memory: CarAgentMemory): void => {
		const car = this.cars.getCar(licensePlate);
		if (!car) {
			throw new Error(`Car with license plate ${licensePlate} not found`);
		}
		car.memory = memory;
	};

	/**
	 * Override the gate's car database.
	 * Useful for testing scenarios where the gate needs pre-initialized records.
	 */
	setGateDatabase = (db: GateAgentCarsDB): void => {
		this.gate.db = db;
	};

	createSession = (licensePlate: string): CarGateSimulationSession => {
		const car = this.cars.getCar(licensePlate);
		if (!car) {
			throw new Error(`Car with license plate ${licensePlate} not found`);
		}

		return new CarGateSimulationSession(this.gate, car, this.envConfig);
	};
}
