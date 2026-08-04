import { describe, expect, it } from "vitest";

import {
	findTemplateForPath,
	folderMatchesPath,
	normalizeTemplateFolder,
} from "../src/templateMatching";
import type { FolderTemplate } from "../src/settings";

function template(folder: string, properties: string): FolderTemplate {
	return { folder, properties };
}

describe("normalizeTemplateFolder", () => {
	it("treats an empty or blank path as the vault root", () => {
		expect(normalizeTemplateFolder("")).toBe("/");
		expect(normalizeTemplateFolder("   ")).toBe("/");
		expect(normalizeTemplateFolder("/")).toBe("/");
	});

	it("strips surrounding slashes and collapses separators", () => {
		expect(normalizeTemplateFolder("/Projects/")).toBe("Projects");
		expect(normalizeTemplateFolder("Projects//Test")).toBe("Projects/Test");
		expect(normalizeTemplateFolder("Projects\\Test")).toBe("Projects/Test");
	});
});

describe("folderMatchesPath", () => {
	it("matches notes of the folder and of its subfolders", () => {
		expect(folderMatchesPath("Projects", "Projects/note.md")).toBe(true);
		expect(folderMatchesPath("Projects", "Projects/Test/note.md")).toBe(true);
		expect(folderMatchesPath("Projects/Test", "Projects/Test/Deep/note.md")).toBe(true);
	});

	it("respects segment boundaries", () => {
		expect(folderMatchesPath("Projects", "Projects-old/note.md")).toBe(false);
		expect(folderMatchesPath("Projects", "MyProjects/note.md")).toBe(false);
		expect(folderMatchesPath("Projects", "note.md")).toBe(false);
	});

	it("matches every note for an empty folder", () => {
		expect(folderMatchesPath("", "note.md")).toBe(true);
		expect(folderMatchesPath("", "Projects/Test/note.md")).toBe(true);
		expect(folderMatchesPath("/", "Projects/Test/note.md")).toBe(true);
	});

	it("accepts paths written with extra slashes", () => {
		expect(folderMatchesPath("/Projects/", "Projects/note.md")).toBe(true);
	});
});

describe("findTemplateForPath", () => {
	const templates = [
		template("Projects/Test", "type"),
		template("Projects", "status"),
		template("", "created"),
	];

	it("returns the first matching template", () => {
		expect(findTemplateForPath(templates, "Projects/Test/note.md")).toBe(templates[0]);
		expect(findTemplateForPath(templates, "Projects/note.md")).toBe(templates[1]);
	});

	it("falls back to the root template", () => {
		expect(findTemplateForPath(templates, "Inbox/note.md")).toBe(templates[2]);
	});

	it("returns null when no template matches", () => {
		expect(findTemplateForPath([template("Projects", "type")], "Inbox/note.md")).toBeNull();
	});
});
