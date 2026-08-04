import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
	it("falls back to the defaults for missing data", () => {
		expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
	});

	it("keeps templates in their stored order", () => {
		const settings = normalizeSettings({
			createMissingProperties: true,
			templates: [
				{ folder: "Projects", properties: "type, status" },
				{ folder: "", properties: "created" },
			],
		});

		expect(settings.createMissingProperties).toBe(true);
		expect(settings.templates).toEqual([
			{ folder: "Projects", properties: "type, status" },
			{ folder: "", properties: "created" },
		]);
	});

	it("repairs malformed entries instead of dropping the whole list", () => {
		const settings = normalizeSettings({
			createMissingProperties: "yes",
			templates: [{ folder: 7 }, null, { properties: "type" }],
		});

		expect(settings.createMissingProperties).toBe(false);
		expect(settings.templates).toEqual([
			{ folder: "", properties: "" },
			{ folder: "", properties: "type" },
		]);
	});
});
