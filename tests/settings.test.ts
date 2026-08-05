import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("normalizeSettings", () => {
	it("falls back to the defaults for missing data", () => {
		expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
	});

	it("leaves the startup run off unless it was stored as enabled", () => {
		expect(DEFAULT_SETTINGS.processAllNotesOnStartup).toBe(false);
		expect(normalizeSettings({}).processAllNotesOnStartup).toBe(false);
		expect(normalizeSettings({ processAllNotesOnStartup: "yes" }).processAllNotesOnStartup).toBe(
			false,
		);
		expect(normalizeSettings({ processAllNotesOnStartup: true }).processAllNotesOnStartup).toBe(
			true,
		);
	});

	it("keeps the previous behavior when the unlisted setting is absent", () => {
		const settings = normalizeSettings({ createMissingProperties: true, templates: [] });

		expect(settings.unlistedProperties).toBe("keep");
	});

	it("accepts every known unlisted behavior and rejects anything else", () => {
		expect(normalizeSettings({ unlistedProperties: "keep" }).unlistedProperties).toBe("keep");
		expect(normalizeSettings({ unlistedProperties: "remove-empty" }).unlistedProperties).toBe(
			"remove-empty",
		);
		expect(normalizeSettings({ unlistedProperties: "remove-all" }).unlistedProperties).toBe(
			"remove-all",
		);
		expect(normalizeSettings({ unlistedProperties: "remove" }).unlistedProperties).toBe("keep");
		expect(normalizeSettings({ unlistedProperties: true }).unlistedProperties).toBe("keep");
	});

	it("keeps templates in their stored order", () => {
		const settings = normalizeSettings({
			createMissingProperties: true,
			unlistedProperties: "remove-all",
			templates: [
				{ folder: "Projects", properties: "type, status" },
				{ folder: "", properties: "created" },
			],
		});

		expect(settings.createMissingProperties).toBe(true);
		expect(settings.unlistedProperties).toBe("remove-all");
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
