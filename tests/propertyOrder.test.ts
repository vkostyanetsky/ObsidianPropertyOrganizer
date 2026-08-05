import { describe, expect, it } from "vitest";

import {
	applyPropertyOrder,
	computePropertyOrder,
	isEmptyPropertyValue,
	parsePropertyList,
} from "../src/propertyOrder";
import type { PropertyOrderOptions } from "../src/propertyOrder";

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

describe("isEmptyPropertyValue", () => {
	it("treats null, blank strings, empty lists and empty maps as empty", () => {
		expect(isEmptyPropertyValue(null)).toBe(true);
		expect(isEmptyPropertyValue(undefined)).toBe(true);
		expect(isEmptyPropertyValue("")).toBe(true);
		expect(isEmptyPropertyValue("   \t ")).toBe(true);
		expect(isEmptyPropertyValue([])).toBe(true);
		expect(isEmptyPropertyValue({})).toBe(true);
	});

	it("treats any other value as filled", () => {
		expect(isEmptyPropertyValue("text")).toBe(false);
		expect(isEmptyPropertyValue(0)).toBe(false);
		expect(isEmptyPropertyValue(false)).toBe(false);
		expect(isEmptyPropertyValue([null])).toBe(false);
		expect(isEmptyPropertyValue({ a: 1 })).toBe(false);
		expect(isEmptyPropertyValue(new Date("2026-08-03"))).toBe(false);
	});
});

describe("computePropertyOrder", () => {
	const template = ["type", "status", "created"];
	const keep: PropertyOrderOptions = { createMissing: false, unlisted: "keep" };
	const createMissing: PropertyOrderOptions = { createMissing: true, unlisted: "keep" };

	it("sorts only the properties the note already has", () => {
		const result = computePropertyOrder(["created", "type"], template, keep);

		expect(result.order).toEqual(["type", "created"]);
		expect(result.changed).toBe(true);
	});

	it("creates the missing properties when asked to", () => {
		const result = computePropertyOrder(["created"], template, createMissing);

		expect(result.order).toEqual(["type", "status", "created"]);
		expect(result.changed).toBe(true);
	});

	it("keeps the relative order of properties the template does not list", () => {
		const result = computePropertyOrder(["zeta", "created", "alpha", "type"], template, keep);

		expect(result.order).toEqual(["type", "created", "zeta", "alpha"]);
	});

	it("reports no change for a note that is already sorted", () => {
		const result = computePropertyOrder(["type", "created", "notes"], template, keep);

		expect(result.order).toEqual(["type", "created", "notes"]);
		expect(result.changed).toBe(false);
	});

	it("reports no change for a note without frontmatter when nothing is created", () => {
		const result = computePropertyOrder([], template, keep);

		expect(result.order).toEqual([]);
		expect(result.changed).toBe(false);
	});

	it("fills a note without frontmatter when missing properties are created", () => {
		const result = computePropertyOrder([], template, createMissing);

		expect(result.order).toEqual(template);
		expect(result.changed).toBe(true);
	});

	it("drops the empty unlisted properties in remove-empty mode", () => {
		const result = computePropertyOrder(["notes", "type", "draft"], template, {
			createMissing: false,
			unlisted: "remove-empty",
			values: { notes: "  ", type: "note", draft: "Text" },
		});

		expect(result.order).toEqual(["type", "draft"]);
		expect(result.changed).toBe(true);
	});

	it("keeps the empty listed properties in remove-empty mode", () => {
		const result = computePropertyOrder(["type", "created"], template, {
			createMissing: false,
			unlisted: "remove-empty",
			values: { type: null, created: "" },
		});

		expect(result.order).toEqual(["type", "created"]);
		expect(result.changed).toBe(false);
	});

	it("keeps every unlisted property in remove-empty mode when no values are known", () => {
		const result = computePropertyOrder(["type", "notes"], template, {
			createMissing: false,
			unlisted: "remove-empty",
		});

		expect(result.order).toEqual(["type", "notes"]);
	});

	it("drops every unlisted property in remove-all mode", () => {
		const result = computePropertyOrder(["notes", "type", "draft"], template, {
			createMissing: false,
			unlisted: "remove-all",
			values: { notes: "Text", type: "note", draft: "Text" },
		});

		expect(result.order).toEqual(["type"]);
		expect(result.changed).toBe(true);
	});

	it("leaves only the template properties in remove-all mode with creation on", () => {
		const result = computePropertyOrder(["notes", "created"], template, {
			createMissing: true,
			unlisted: "remove-all",
			values: { notes: "Text", created: 1 },
		});

		expect(result.order).toEqual(template);
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

	it("removes the properties the order does not mention", () => {
		const frontmatter: Record<string, unknown> = {
			draft: "",
			type: "note",
			summary: "Report",
		};

		applyPropertyOrder(frontmatter, ["type"]);

		expect(frontmatter).toEqual({ type: "note" });
	});

	it("keeps falsy values as they are", () => {
		const frontmatter: Record<string, unknown> = { done: false, count: 0, note: "" };

		applyPropertyOrder(frontmatter, ["count", "done", "note"]);

		expect(frontmatter).toEqual({ count: 0, done: false, note: "" });
	});
});
