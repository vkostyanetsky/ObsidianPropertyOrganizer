import { describe, expect, it } from "vitest";

import { formatSummary, organizeNotes } from "../src/batch";
import { organizeNote } from "../src/organizer";
import type { CachedFrontMatter, NoteAccess, OrganizeOptions } from "../src/organizer";

interface FakeNote {
	path: string;
	/** null means the note has no frontmatter block at all. */
	frontmatter: Record<string, unknown> | null;
	/** Simulates a frontmatter block that fails to parse. */
	invalidYaml?: boolean;
	/** Simulates a note the metadata cache does not know about yet. */
	uncached?: boolean;
}

class FakeNoteAccess implements NoteAccess<FakeNote> {
	readonly reads: string[] = [];

	getCachedFrontMatter(note: FakeNote): CachedFrontMatter | null {
		if (note.uncached === true || note.invalidYaml === true) {
			return null;
		}

		if (note.frontmatter === null) {
			return { exists: false, properties: {} };
		}

		return { exists: true, properties: { ...note.frontmatter } };
	}

	processFrontMatter(
		note: FakeNote,
		fn: (frontmatter: Record<string, unknown>) => void,
	): Promise<void> {
		this.reads.push(note.path);

		if (note.invalidYaml === true) {
			return Promise.reject(new Error("Unexpected scalar at node end"));
		}

		const frontmatter: Record<string, unknown> = { ...(note.frontmatter ?? {}) };

		fn(frontmatter);
		note.frontmatter = frontmatter;

		return Promise.resolve();
	}
}

function note(path: string, frontmatter: Record<string, unknown> | null): FakeNote {
	return { path, frontmatter };
}

const TEMPLATE = ["type", "status", "created"];

const DEFAULTS: OrganizeOptions = { createMissing: false, unlisted: "keep" };
const CREATE_MISSING: OrganizeOptions = { createMissing: true, unlisted: "keep" };
const REMOVE_EMPTY: OrganizeOptions = { createMissing: false, unlisted: "remove-empty" };
const REMOVE_ALL: OrganizeOptions = { createMissing: false, unlisted: "remove-all" };

describe("organizeNote", () => {
	it("sorts the properties a note already has", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { created: "2026-08-03", type: "note" });

		const result = await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(result.outcome).toBe("updated");
		expect(Object.keys(target.frontmatter ?? {})).toEqual(["type", "created"]);
	});

	it("keeps unlisted properties after the listed ones", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { zeta: 1, created: 2, alpha: 3, type: 4 });

		await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(Object.keys(target.frontmatter ?? {})).toEqual(["type", "created", "zeta", "alpha"]);
	});

	it("does not read a note that is already sorted", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { type: "note", created: "2026-08-03" });

		const result = await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(result.outcome).toBe("unchanged");
		expect(access.reads).toEqual([]);
	});

	it("leaves a note without frontmatter alone when nothing is created", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", null);

		const result = await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(result.outcome).toBe("skipped");
		expect(access.reads).toEqual([]);
		expect(target.frontmatter).toBeNull();
	});

	it("creates the missing properties as empty values", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { created: "2026-08-03" });

		const result = await organizeNote(target, TEMPLATE, CREATE_MISSING, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({
			type: null,
			status: null,
			created: "2026-08-03",
		});
		expect(Object.keys(target.frontmatter ?? {})).toEqual(TEMPLATE);
	});

	it("creates frontmatter for a note without one when missing properties are created", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", null);

		const result = await organizeNote(target, TEMPLATE, CREATE_MISSING, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({ type: null, status: null, created: null });
	});

	it("reports an error for a note with invalid YAML", async () => {
		const access = new FakeNoteAccess();
		const target: FakeNote = { path: "broken.md", frontmatter: null, invalidYaml: true };

		const result = await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(result.outcome).toBe("error");
		expect(result.error).toBeInstanceOf(Error);
	});

	it("falls back to reading the note when the cache knows nothing", async () => {
		const access = new FakeNoteAccess();
		const target: FakeNote = {
			path: "a.md",
			frontmatter: { created: 1, type: 2 },
			uncached: true,
		};

		const result = await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(result.outcome).toBe("updated");
		expect(access.reads).toEqual(["a.md"]);
	});
});

describe("organizeNote with unlisted properties", () => {
	it("keeps every unlisted property by default", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { summary: "", type: "note", tags: ["work"] });

		await organizeNote(target, TEMPLATE, DEFAULTS, access);

		expect(target.frontmatter).toEqual({ type: "note", summary: "", tags: ["work"] });
	});

	it("removes only the empty unlisted properties", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", {
			blank: "   ",
			created: "2026-08-03",
			emptyList: [],
			emptyMap: {},
			empty: null,
			summary: "Report",
			type: "note",
			done: false,
			count: 0,
		});

		const result = await organizeNote(target, TEMPLATE, REMOVE_EMPTY, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({
			type: "note",
			created: "2026-08-03",
			summary: "Report",
			done: false,
			count: 0,
		});
		expect(Object.keys(target.frontmatter ?? {})).toEqual([
			"type",
			"created",
			"summary",
			"done",
			"count",
		]);
	});

	it("keeps the listed properties even when they are empty", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { summary: "", created: null, type: "" });

		const result = await organizeNote(target, TEMPLATE, REMOVE_EMPTY, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({ type: "", created: null });
	});

	it("leaves a note alone when its unlisted properties are all filled", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { type: "note", created: 1, summary: "Report" });

		const result = await organizeNote(target, TEMPLATE, REMOVE_EMPTY, access);

		expect(result.outcome).toBe("unchanged");
		expect(access.reads).toEqual([]);
	});

	it("removes every unlisted property, empty or not", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { summary: "Report", created: 1, draft: "", type: "note" });

		const result = await organizeNote(target, TEMPLATE, REMOVE_ALL, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({ type: "note", created: 1 });
		expect(Object.keys(target.frontmatter ?? {})).toEqual(["type", "created"]);
	});

	it("removes unlisted properties and creates the missing ones together", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { summary: "Report", created: 1 });

		await organizeNote(
			target,
			TEMPLATE,
			{ createMissing: true, unlisted: "remove-all" },
			access,
		);

		expect(target.frontmatter).toEqual({ type: null, status: null, created: 1 });
		expect(Object.keys(target.frontmatter ?? {})).toEqual(TEMPLATE);
	});

	it("empties the frontmatter of a note whose properties are all unlisted", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { summary: "Report" });

		const result = await organizeNote(target, TEMPLATE, REMOVE_ALL, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({});
	});

	it("leaves a note without frontmatter alone in every removal mode", async () => {
		const access = new FakeNoteAccess();
		const emptyNote = note("a.md", null);
		const otherNote = note("b.md", null);

		expect((await organizeNote(emptyNote, TEMPLATE, REMOVE_EMPTY, access)).outcome).toBe(
			"skipped",
		);
		expect((await organizeNote(otherNote, TEMPLATE, REMOVE_ALL, access)).outcome).toBe(
			"skipped",
		);
		expect(access.reads).toEqual([]);
		expect(emptyNote.frontmatter).toBeNull();
		expect(otherNote.frontmatter).toBeNull();
	});

	it("removes unlisted properties of a note the cache knows nothing about", async () => {
		const access = new FakeNoteAccess();
		const target: FakeNote = {
			path: "a.md",
			frontmatter: { summary: "", type: "note" },
			uncached: true,
		};

		const result = await organizeNote(target, TEMPLATE, REMOVE_EMPTY, access);

		expect(result.outcome).toBe("updated");
		expect(access.reads).toEqual(["a.md"]);
		expect(target.frontmatter).toEqual({ type: "note" });
	});
});

describe("organizeNotes", () => {
	it("counts every outcome and keeps going after an error", async () => {
		const access = new FakeNoteAccess();
		const notes: FakeNote[] = [
			note("sorted.md", { type: "note", created: 1 }),
			note("unsorted.md", { created: 1, type: "note" }),
			{ path: "broken.md", frontmatter: null, invalidYaml: true },
			note("empty.md", null),
			note("outside.md", { created: 1, type: "note" }),
		];
		const errors: string[] = [];

		const summary = await organizeNotes(notes, {
			resolveTemplate: (target) => (target.path === "outside.md" ? null : TEMPLATE),
			...DEFAULTS,
			access,
			onError: (target) => errors.push(target.path),
		});

		expect(summary).toEqual({ updated: 1, unchanged: 1, skipped: 2, errors: 1 });
		expect(errors).toEqual(["broken.md"]);
		expect(Object.keys(notes[1].frontmatter ?? {})).toEqual(["type", "created"]);
		expect(Object.keys(notes[4].frontmatter ?? {})).toEqual(["created", "type"]);
	});

	it("applies the unlisted behavior to every matched note and to no other", async () => {
		const access = new FakeNoteAccess();
		const notes: FakeNote[] = [
			note("matched.md", { summary: "", created: 1, type: "note" }),
			note("also-matched.md", { type: "note", draft: "Text" }),
			note("outside.md", { summary: "", created: 1, type: "note" }),
		];

		const summary = await organizeNotes(notes, {
			resolveTemplate: (target) => (target.path === "outside.md" ? null : TEMPLATE),
			...REMOVE_EMPTY,
			access,
		});

		expect(summary).toEqual({ updated: 1, unchanged: 1, skipped: 1, errors: 0 });
		expect(notes[0].frontmatter).toEqual({ type: "note", created: 1 });
		expect(notes[1].frontmatter).toEqual({ type: "note", draft: "Text" });
		expect(notes[2].frontmatter).toEqual({ summary: "", created: 1, type: "note" });
	});
});

describe("formatSummary", () => {
	it("renders the summary notice", () => {
		expect(formatSummary({ updated: 3, unchanged: 2, skipped: 1, errors: 0 })).toBe(
			"3 notes updated, 2 unchanged, 1 skipped, 0 errors.",
		);
	});
});
