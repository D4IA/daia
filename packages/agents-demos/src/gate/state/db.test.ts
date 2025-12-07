import { describe, it, expect } from "vitest";
import { GateAgentCarsDB, type GateAgentCarData } from "./db";

const fakePK = "fake-public-key-string";

type SerializedCarEntry = {
	id: string;
	data: {
		licensePlate: string;
		publicKey: unknown;
		ratePerHour: number;
		parkedAt: string;
	};
};

describe("CarsDB", () => {
	it("adds a car and retrieves it by id and plate", () => {
		const db = new GateAgentCarsDB();
		const car: GateAgentCarData = {
			licensePlate: "ABC-123",
			publicKey: fakePK,
			ratePerHour: 5,
			parkedAt: new Date(2025, 11, 30),
		};

		const id = db.add(car);
		expect(typeof id).toBe("string");

		const byId = db.getById(id);
		expect(byId).toBeDefined();
		expect(byId!.id).toBe(id);
		expect(byId!.data.licensePlate).toBe(car.licensePlate);

		const byPlate = db.getByPlate("ABC-123");
		expect(byPlate).toEqual(byId);
	});

	it("returns all and supports remove", () => {
		const db = new GateAgentCarsDB();
		const carA: GateAgentCarData = {
			licensePlate: "A",
			publicKey: fakePK,
			ratePerHour: 1,
			parkedAt: new Date(),
		};
		const carB: GateAgentCarData = {
			licensePlate: "B",
			publicKey: fakePK,
			ratePerHour: 2,
			parkedAt: new Date(),
		};

		const idA = db.add(carA);
		const idB = db.add(carB);

		expect(
			db
				.all()
				.map((r) => r.id)
				.sort(),
		).toEqual([idA, idB].sort());

		expect(db.remove(idA)).toBe(true);
		expect(db.getById(idA)).toBeUndefined();
		expect(db.getByPlate("A")).toBeUndefined();

		expect(db.remove(idA)).toBe(false);
		expect(db.all().map((r) => r.id)).toEqual([idB]);
	});

	it("handles duplicate license plates by updating plate index to latest", () => {
		const db = new GateAgentCarsDB();
		const car1: GateAgentCarData = {
			licensePlate: "DUP",
			publicKey: fakePK,
			ratePerHour: 1,
			parkedAt: new Date(),
		};
		const car2: GateAgentCarData = {
			licensePlate: "DUP",
			publicKey: fakePK,
			ratePerHour: 2,
			parkedAt: new Date(),
		};

		const id1 = db.add(car1);
		const id2 = db.add(car2);

		expect(id1).not.toBe(id2);
		const byPlate = db.getByPlate("DUP");
		expect(byPlate).toBeDefined();
		expect(byPlate!.id).toBe(id2);

		// both should still be retrievable by id
		expect(db.getById(id1)).toBeDefined();
		expect(db.getById(id2)).toBeDefined();
	});

	it("getByPlate returns undefined for unknown plates", () => {
		const db = new GateAgentCarsDB();
		expect(db.getByPlate("NOPE")).toBeUndefined();
	});

	it("toJSON and fromJSON preserve state and dates and nextId", () => {
		const db = new GateAgentCarsDB();
		const car: GateAgentCarData = {
			licensePlate: "JSON-1",
			publicKey: fakePK,
			ratePerHour: 10,
			parkedAt: new Date(2025, 0, 2, 3, 4, 5),
		};
		const id = db.add(car);

		const json = db.toJSON();
		expect(json).toBeDefined();

		const db2 = GateAgentCarsDB.fromJSON(json);
		const byId = db2.getById(id);
		expect(byId).toBeDefined();
		expect(byId!.data.parkedAt instanceof Date).toBe(true);
		expect(byId!.data.parkedAt.toISOString()).toBe(car.parkedAt.toISOString());
		expect(db2.getByPlate("JSON-1")!.id).toBe(id);

		const id2 = db2.add({
			licensePlate: "JSON-2",
			publicKey: fakePK,
			ratePerHour: 1,
			parkedAt: new Date(),
		});
		expect(parseInt(id2, 10)).toBeGreaterThan(parseInt(id, 10));
	});

	it("toJSON returns independent serializable object and does not mutate DB", () => {
		const db = new GateAgentCarsDB();
		const date = new Date(2025, 5, 6);
		const car: GateAgentCarData = {
			licensePlate: "NO-MUT",
			publicKey: fakePK,
			ratePerHour: 7,
			parkedAt: date,
		};
		const id = db.add(car);
		const json = db.toJSON();
		expect(json.cars.length).toBeGreaterThan(0);
		const entry = json.cars[0] as SerializedCarEntry;

		// serialized date is a string and equals the ISO of the original date
		expect(typeof entry.data.parkedAt).toBe("string");
		expect(entry.data.parkedAt).toBe(date.toISOString());

		// DB's stored date instance remains unchanged
		expect(db.getById(id)!.data.parkedAt).toBe(date);
		expect(db.getById(id)!.data.parkedAt instanceof Date).toBe(true);

		// mutating the returned JSON should not affect the DB
		entry.data.licensePlate = "MUTATED";
		expect(db.getById(id)!.data.licensePlate).toBe("NO-MUT");
	});

	it("fromJSON does not mutate input object and returns independent DB", () => {
		const db = new GateAgentCarsDB();
		const date = new Date(2025, 6, 7);
		const car: GateAgentCarData = {
			licensePlate: "FROM-MUT",
			publicKey: fakePK,
			ratePerHour: 8,
			parkedAt: date,
		};
		const id = db.add(car);
		const json = db.toJSON();
		const jsonCopy = JSON.parse(JSON.stringify(json));

		const db2 = GateAgentCarsDB.fromJSON(json);
		// input JSON should remain unchanged
		expect(json).toEqual(jsonCopy);

		// modifying db2 should not affect original json
		const byId = db2.getById(id)!;
		byId.data.licensePlate = "CHANGED";
		const firstEntry = json.cars[0] as SerializedCarEntry;
		expect(firstEntry.data.licensePlate).toBe("FROM-MUT");
	});

	it("fromJSON throws on invalid data", () => {
		expect(() => GateAgentCarsDB.fromJSON({ foo: "bar" })).toThrow();
	});
});
