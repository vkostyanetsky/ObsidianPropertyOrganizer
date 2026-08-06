import { describe, expect, it } from "vitest";

import { findPropertyListSegment, replacePropertyListSegment } from "../src/propertyListInput";

/** Completes the entry the caret is in, as choosing a suggestion does. */
function complete(value: string, caret: number, name: string): { value: string; caret: number } {
	return replacePropertyListSegment(value, findPropertyListSegment(value, caret), name);
}

describe("findPropertyListSegment", () => {
	it("treats an empty field as one empty entry", () => {
		expect(findPropertyListSegment("", 0)).toEqual({
			start: 0,
			end: 0,
			query: "",
			otherNames: [],
		});
	});

	it("finds the only entry of a single-name list", () => {
		const segment = findPropertyListSegment("typ", 3);

		expect(segment).toEqual({ start: 0, end: 3, query: "typ", otherNames: [] });
	});

	it("finds the entry after a comma and ignores the spaces around the name", () => {
		const segment = findPropertyListSegment("type,  stat", 11);

		expect(segment.start).toBe(5);
		expect(segment.end).toBe(11);
		expect(segment.query).toBe("stat");
	});

	it("finds an entry in the middle of the list", () => {
		const segment = findPropertyListSegment("type, stat, created", 10);

		expect(segment.start).toBe(5);
		expect(segment.end).toBe(10);
		expect(segment.query).toBe("stat");
	});

	it("keeps a caret written up against a comma in the entry before it", () => {
		expect(findPropertyListSegment("type,status", 4).query).toBe("type");
		expect(findPropertyListSegment("type,status", 5).query).toBe("status");
	});

	it("reports an empty entry once the comma has been typed", () => {
		expect(findPropertyListSegment("type,", 5)).toEqual({
			start: 5,
			end: 5,
			query: "",
			otherNames: ["type"],
		});
	});

	it("reports the other entries, without the empty ones", () => {
		const segment = findPropertyListSegment("type, , stat, created,", 12);

		expect(segment.query).toBe("stat");
		expect(segment.otherNames).toEqual(["type", "created"]);
	});

	it("clamps a caret outside the field", () => {
		expect(findPropertyListSegment("type, status", -5).query).toBe("type");
		expect(findPropertyListSegment("type, status", 99).query).toBe("status");
	});
});

describe("replacePropertyListSegment", () => {
	it("completes the name in an empty field", () => {
		expect(complete("", 0, "type")).toEqual({ value: "type", caret: 4 });
	});

	it("replaces a partial name with the full one", () => {
		expect(complete("typ", 3, "type")).toEqual({ value: "type", caret: 4 });
	});

	it("keeps the entries before and after the completed one", () => {
		expect(complete("type, stat, created", 10, "status")).toEqual({
			value: "type, status, created",
			caret: 12,
		});
	});

	it("completes the entry after the last comma", () => {
		expect(complete("type, ", 6, "status")).toEqual({ value: "type, status", caret: 12 });
	});

	it("keeps the spaces before the name and drops the ones after it", () => {
		expect(complete("type,  stat  , created", 11, "status")).toEqual({
			value: "type,  status, created",
			caret: 13,
		});
	});

	it("completes an entry the caret sits inside of", () => {
		expect(complete("type, cr, tags", 8, "created")).toEqual({
			value: "type, created, tags",
			caret: 13,
		});
	});

	it("leaves a name the vault does not have alone", () => {
		const value = "type, whatever";

		expect(findPropertyListSegment(value, value.length).query).toBe("whatever");
		expect(complete(value, value.length, "whatever")).toEqual({ value, caret: value.length });
	});
});
