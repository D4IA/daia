import { CarAgentMemory } from "../car/db/memory";
import { CarConfiguration } from "./environment";

type Car = {
	config: CarConfiguration;
	memory: CarAgentMemory;
};

export class CarStorage {
	private readonly cars: Map<string, Car> = new Map();

	/**
	 * Add or update a car in the storage
	 */
	setCar(car: Car): void {
		this.cars.set(car.config.licensePlate, car);
	}

	/**
	 * Get a car by license plate
	 */
	getCar(licensePlate: string): Car | undefined {
		return this.cars.get(licensePlate);
	}

	/**
	 * Check if a car exists in the storage
	 */
	hasCar(licensePlate: string): boolean {
		return this.cars.has(licensePlate);
	}

	/**
	 * Remove a car from the storage
	 */
	removeCar(licensePlate: string): boolean {
		return this.cars.delete(licensePlate);
	}

	/**
	 * Get all cars in the storage
	 */
	getAllCars(): Car[] {
		return Array.from(this.cars.values());
	}

	/**
	 * Get the number of cars in the storage
	 */
	getCarCount(): number {
		return this.cars.size;
	}

	/**
	 * Clear all cars from the storage
	 */
	clear(): void {
		this.cars.clear();
	}
}
