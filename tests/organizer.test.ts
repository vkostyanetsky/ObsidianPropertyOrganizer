import { describe, expect, it } from "vitest";

import { formatSummary, organizeNotes } from "../src/batch";
import { organizeNote } from "../src/organizer";
import type { CachedFrontMatter, NoteAccess } from "../src/organizer";

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
			return { exists: false, keys: [] };
		}

		return { exists: true, keys: Object.keys(note.frontmatter) };
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

describe("organizeNote", () => {
	it("sorts the properties a note already has", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { created: "2026-08-03", type: "note" });

		const result = await organizeNote(target, TEMPLATE, false, access);

		expect(result.outcome).toBe("updated");
		expect(Object.keys(target.frontmatter ?? {})).toEqual(["type", "created"]);
	});

	it("keeps unlisted properties after the listed ones", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { zeta: 1, created: 2, alpha: 3, type: 4 });

		await organizeNote(target, TEMPLATE, false, access);

		expect(Object.keys(target.frontmatter ?? {})).toEqual(["type", "created", "zeta", "alpha"]);
	});

	it("does not read a note that is already sorted", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { type: "note", created: "2026-08-03" });

		const result = await organizeNote(target, TEMPLATE, false, access);

		expect(result.outcome).toBe("unchanged");
		expect(access.reads).toEqual([]);
	});

	it("leaves a note without frontmatter alone when nothing is created", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", null);

		const result = await organizeNote(target, TEMPLATE, false, access);

		expect(result.outcome).toBe("skipped");
		expect(access.reads).toEqual([]);
		expect(target.frontmatter).toBeNull();
	});

	it("creates the missing properties as empty values", async () => {
		const access = new FakeNoteAccess();
		const target = note("a.md", { created: "2026-08-03" });

		const result = await organizeNote(target, TEMPLATE, true, access);

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

		const result = await organizeNote(target, TEMPLATE, true, access);

		expect(result.outcome).toBe("updated");
		expect(target.frontmatter).toEqual({ type: null, status: null, created: null });
	});

	it("reports an error for a note with invalid YAML", async () => {
		const access = new FakeNoteAccess();
		const target: FakeNote = { path: "broken.md", frontmatter: null, invalidYaml: true };

		const result = await organizeNote(target, TEMPLATE, false, access);

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

		const result = await organizeNote(target, TEMPLATE, false, access);

		expect(result.outcome).toBe("updated");
		expect(access.reads).toEqual(["a.md"]);
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
			createMissing: false,
			access,
			onError: (target) => errors.push(target.path),
		});

		expect(summary).toEqual({ updated: 1, unchanged: 1, skipped: 2, errors: 1 });
		expect(errors).toEqual(["broken.md"]);
		expect(Object.keys(notes[1].frontmatter ?? {})).toEqual(["type", "created"]);
		expect(Object.keys(notes[4].frontmatter ?? {})).toEqual(["created", "type"]);
	});
});

describe("formatSummary", () => {
	it("renders the summary notice", () => {
		expect(formatSummary({ updated: 3, unchanged: 2, skipped: 1, errors: 0 })).toBe(
			"Property Organizer: 3 notes updated, 2 unchanged, 1 skipped, 0 errors.",
		);
	});
});
