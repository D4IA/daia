import { describe, it } from "vitest";
import { JsonUtils } from "../json";
import z from "zod/v3";

describe("JsonUtils", () => {
	it("should parse valid JSON with schema", () => {
		const schema = z.object({
			name: z.string(),
			value: z.number(),
		});

		JsonUtils.parseNoThrow('{"name":"test","value":123}', schema);
	});

	it("should return null for invalid JSON", () => {
		const schema = z.object({
			name: z.string(),
		});

		JsonUtils.parseNoThrow("invalid-json", schema);
	});

	it("should return null when data does not match schema", () => {
		const schema = z.object({
			requiredField: z.string(),
		});

		JsonUtils.parseNoThrow('{"wrongField":"value"}', schema);
	});

	it("should parse complex nested object", () => {
		const schema = z.object({
			user: z.object({
				name: z.string(),
				age: z.number(),
				tags: z.array(z.string()),
			}),
		});

		JsonUtils.parseNoThrow('{"user":{"name":"John","age":30,"tags":["a","b"]}}', schema);
	});

	it("should parse array schema", () => {
		const schema = z.array(z.number());

		JsonUtils.parseNoThrow("[1,2,3,4,5]", schema);
	});

	it("should parse string schema", () => {
		const schema = z.string();

		JsonUtils.parseNoThrow('"hello world"', schema);
	});

	it("should parse number schema", () => {
		const schema = z.number();

		JsonUtils.parseNoThrow("42", schema);
	});

	it("should parse boolean schema", () => {
		const schema = z.boolean();

		JsonUtils.parseNoThrow("true", schema);
	});

	it("should return null for malformed JSON", () => {
		const schema = z.object({});

		JsonUtils.parseNoThrow('{"key": }', schema);
	});

	it("should parse optional fields", () => {
		const schema = z.object({
			required: z.string(),
			optional: z.string().optional(),
		});

		JsonUtils.parseNoThrow('{"required":"value"}', schema);
	});

	it("should parse discriminated union", () => {
		const schema = z.discriminatedUnion("type", [
			z.object({ type: z.literal("a"), valueA: z.string() }),
			z.object({ type: z.literal("b"), valueB: z.number() }),
		]);

		JsonUtils.parseNoThrow('{"type":"a","valueA":"test"}', schema);
	});

	it("should return null for empty string", () => {
		const schema = z.object({});

		JsonUtils.parseNoThrow("", schema);
	});
});
