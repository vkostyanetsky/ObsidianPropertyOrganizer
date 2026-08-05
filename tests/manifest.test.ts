import { describe, expect, it } from "vitest";

import manifest from "../manifest.json";
import packageJson from "../package.json";
import versions from "../versions.json";

const REQUIRED_KEYS = [
	"id",
	"name",
	"version",
	"minAppVersion",
	"description",
	"author",
	"isDesktopOnly",
];

const ALLOWED_KEYS = [...REQUIRED_KEYS, "authorUrl", "fundingUrl", "helpUrl"];

const SEMVER = /^\d+\.\d+\.\d+$/;

const versionMap: Record<string, string> = versions;

describe("manifest.json", () => {
	it("has every required key and no unknown one", () => {
		for (const key of REQUIRED_KEYS) {
			expect(Object.keys(manifest)).toContain(key);
		}

		for (const key of Object.keys(manifest)) {
			expect(ALLOWED_KEYS).toContain(key);
		}
	});

	it("uses an id that follows the submission rules", () => {
		expect(manifest.id).toMatch(/^[a-z0-9-]+$/);
		expect(manifest.id).not.toContain("obsidian");
		expect(manifest.id.endsWith("-plugin")).toBe(false);
	});

	it("uses a name that follows the submission rules", () => {
		expect(manifest.name).not.toMatch(/obsidian/i);
		expect(manifest.name.endsWith("Plugin")).toBe(false);
	});

	it("uses a description that follows the submission rules", () => {
		expect(manifest.description).not.toMatch(/obsidian|this plugin/i);
		expect(manifest.description.length).toBeLessThanOrEqual(250);
		expect(manifest.description).toMatch(/[.!?)]$/);
	});

	it("declares versions consistently", () => {
		expect(manifest.version).toMatch(SEMVER);
		expect(manifest.minAppVersion).toMatch(SEMVER);
		expect(manifest.version).toBe(packageJson.version);
		expect(manifest.description).toBe(packageJson.description);
	});

	it("supports mobile", () => {
		expect(manifest.isDesktopOnly).toBe(false);
	});
});

describe("versions.json", () => {
	it("is not empty", () => {
		expect(Object.keys(versionMap).length).toBeGreaterThan(0);
	});

	it("maps plugin versions to app versions", () => {
		for (const [pluginVersion, appVersion] of Object.entries(versionMap)) {
			expect(pluginVersion).toMatch(SEMVER);
			expect(appVersion).toMatch(SEMVER);
		}
	});

	it("has an entry for the current version", () => {
		expect(Object.keys(versionMap)).toContain(manifest.version);
	});

	it("requires the same app version as the manifest does", () => {
		expect(versionMap[manifest.version]).toBe(manifest.minAppVersion);
	});
});
