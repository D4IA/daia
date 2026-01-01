import { z } from "zod/v3";
import type { WithId } from "../../util/withId";

export type GateAgentCarData = {
	licensePlate: string;
	publicKey: string;
	ratePerHour: number;
	parkedAt: Date;
};

const carDataSerializedSchema = z.object({
	licensePlate: z.string(),
	publicKey: z.string(),
	ratePerHour: z.number(),
	parkedAt: z.string(),
});

const carEntrySchema = z.object({
	id: z.string(),
	data: carDataSerializedSchema,
});

const dbSchema = z.object({
	nextId: z.number(),
	cars: z.array(carEntrySchema),
});

export class GateAgentCarsDB {
	private carsById: Map<string, GateAgentCarData> = new Map();
	private licenseIndex: Map<string, string> = new Map();
	private nextId = 1;

	public readonly add = (car: GateAgentCarData): string => {
		const id = String(this.nextId++);
		this.carsById.set(id, { ...car });
		this.licenseIndex.set(car.licensePlate, id);
		return id;
	};

	public readonly getById = (id: string): WithId<GateAgentCarData> | undefined => {
		const data = this.carsById.get(id);
		return data ? { id, data } : undefined;
	};

	public readonly getByPlate = (licensePlate: string): WithId<GateAgentCarData> | undefined => {
		const id = this.licenseIndex.get(licensePlate);
		return id ? this.getById(id) : undefined;
	};

	public readonly remove = (id: string): boolean => {
		const data = this.carsById.get(id);
		if (!data) return false;
		this.carsById.delete(id);
		this.licenseIndex.delete(data.licensePlate);
		return true;
	};

	public readonly all = (): WithId<GateAgentCarData>[] =>
		Array.from(this.carsById.entries()).map(([id, data]) => ({ id, data }));

	public readonly toJSON = () => {
		return {
			nextId: this.nextId,
			cars: Array.from(this.carsById.entries()).map(([id, data]) => ({
				id,
				data: {
					...data,
					parkedAt: data.parkedAt.toISOString(),
				},
			})),
		};
	};

	public static fromJSON = (obj: unknown): GateAgentCarsDB => {
		const parsed = dbSchema.safeParse(obj);
		if (!parsed.success) throw new Error("Invalid CarsDB JSON");
		const { nextId, cars } = parsed.data;
		const db = new GateAgentCarsDB();
		db.nextId = nextId;
		for (const { id, data } of cars) {
			const car: GateAgentCarData = {
				licensePlate: data.licensePlate,
				publicKey: data.publicKey,
				ratePerHour: data.ratePerHour,
				parkedAt: new Date(data.parkedAt),
			};
			db.carsById.set(id, car);
			db.licenseIndex.set(car.licensePlate, id);
		}

		// Ensure nextId is at least max(existingId)+1
		const maxId = Math.max(0, ...Array.from(db.carsById.keys()).map((k) => parseInt(k, 10) || 0));
		if (db.nextId <= maxId) db.nextId = maxId + 1;

		return db;
	};
}
