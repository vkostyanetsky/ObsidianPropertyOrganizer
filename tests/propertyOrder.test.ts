import { describe, expect, it } from "vitest";

import {
	applyPropertyOrder,
	computePropertyOrder,
	parsePropertyList,
} from "../src/propertyOrder";

describe("parsePropertyList", () => {
	it("trims names, drops empty entries and keeps the first duplicate", () => {
		expect(parsePropertyList("  type ,, status ,  type , created,")).toEqual([
			"type",
			"status",
			"created",
		]);
	});

	it("keeps the case of property names", () => {
		expect(parsePropertyList("Type, tYpe, TYPE")).toEqual(["Type", "tYpe", "TYPE"]);
	});

	it("returns an empty list for an empty or blank input", () => {
		expect(parsePropertyList("")).toEqual([]);
		expect(parsePropertyList("  ,  , ")).toEqual([]);
	});
});

describe("computePropertyOrder", () => {
	const template = ["type", "status", "created"];

	it("sorts only the properties the note already has", () => {
		const result = computePropertyOrder(["created", "type"], template, false);

		expect(result.order).toEqual(["type", "created"]);
		expect(result.changed).toBe(true);
	});

	it("creates the missing properties when asked to", () => {
		const result = computePropertyOrder(["created"], template, true);

		expect(result.order).toEqual(["type", "status", "created"]);
		expect(result.changed).toBe(true);
	});

	it("keeps the relative order of properties the template does not list", () => {
		const result = computePropertyOrder(["zeta", "created", "alpha", "type"], template, false);

		expect(result.order).toEqual(["type", "created", "zeta", "alpha"]);
	});

	it("reports no change for a note that is already sorted", () => {
		const result = computePropertyOrder(["type", "created", "notes"], template, false);

		expect(result.order).toEqual(["type", "created", "notes"]);
		expect(result.changed).toBe(false);
	});

	it("reports no change for a note without frontmatter when nothing is created", () => {
		const result = computePropertyOrder([], template, false);

		expect(result.order).toEqual([]);
		expect(result.changed).toBe(false);
	});

	it("fills a note without frontmatter when missing properties are created", () => {
		const result = computePropertyOrder([], template, true);

		expect(result.order).toEqual(template);
		expect(result.changed).toBe(true);
	});
});

describe("applyPropertyOrder", () => {
	it("reorders keys without touching the values", () => {
		const frontmatter: Record<string, unknown> = {
			created: "2026-08-03",
			tags: ["a", "b"],
			type: "note",
		};

		applyPropertyOrder(frontmatter, ["type", "created", "tags"]);

		expect(Object.keys(frontmatter)).toEqual(["type", "created", "tags"]);
		expect(frontmatter).toEqual({
			type: "note",
			created: "2026-08-03",
			tags: ["a", "b"],
		});
	});

	it("creates missing properties as null so they are written empty", () => {
		const frontmatter: Record<string, unknown> = { created: "2026-08-03" };

		applyPropertyOrder(frontmatter, ["type", "status", "created"]);

		expect(Object.keys(frontmatter)).toEqual(["type", "status", "created"]);
		expect(frontmatter.type).toBeNull();
		expect(frontmatter.status).toBeNull();
		expect(frontmatter.created).toBe("2026-08-03");
	});

	it("keeps falsy values as they are", () => {
		const frontmatter: Record<string, unknown> = { done: false, count: 0, note: "" };

		applyPropertyOrder(frontmatter, ["count", "done", "note"]);

		expect(frontmatter).toEqual({ count: 0, done: false, note: "" });
	});
});
