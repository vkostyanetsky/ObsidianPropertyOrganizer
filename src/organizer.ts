import { applyPropertyOrder, computePropertyOrder } from "./propertyOrder";
import type { UnlistedPropertiesBehavior } from "./settings";

export type NoteOutcome = "updated" | "unchanged" | "skipped" | "error";

/** The settings that decide what happens to a note matched by a template. */
export interface OrganizeOptions {
	/** Create properties listed in the template but missing from the note. */
	createMissing: boolean;
	/** What to do with properties the template does not list. */
	unlisted: UnlistedPropertiesBehavior;
}

export interface NoteResult {
	outcome: NoteOutcome;
	/** Present only when `outcome` is `error`. */
	error?: unknown;
}

/** What the metadata cache knows about a note's frontmatter. */
export interface CachedFrontMatter {
	/** Whether the note has a frontmatter block. */
	exists: boolean;
	/** Property values keyed by name, in their current order. */
	properties: Record<string, unknown>;
}

/**
 * The pieces of the vault a note needs to be organized. Kept as an interface so
 * the organizing logic can be tested without a running Obsidian instance.
 */
export interface NoteAccess<TNote> {
	/**
	 * Cheap pre-check used to avoid opening notes that are already in order.
	 * Returns null when the cache cannot answer (no cache entry yet, or a
	 * frontmatter block that failed to parse), in which case the note is read.
	 */
	getCachedFrontMatter(note: TNote): CachedFrontMatter | null;
	/** Reads the note, hands its frontmatter to `fn`, and writes it back. */
	processFrontMatter(
		note: TNote,
		fn: (frontmatter: Record<string, unknown>) => void,
	): Promise<void>;
}

/**
 * Applies a template's property order to a single note.
 *
 * The note is only written when its properties are actually out of order (or
 * when missing properties have to be created, or unlisted ones removed).
 */
export async function organizeNote<TNote>(
	note: TNote,
	templateProperties: string[],
	options: OrganizeOptions,
	access: NoteAccess<TNote>,
): Promise<NoteResult> {
	try {
		const cached = access.getCachedFrontMatter(note);

		if (cached !== null) {
			if (!cached.exists && !options.createMissing) {
				return { outcome: "skipped" };
			}

			const preview = computePropertyOrder(
				Object.keys(cached.properties),
				templateProperties,
				{ ...options, values: cached.properties },
			);

			if (!preview.changed) {
				return { outcome: "unchanged" };
			}
		}

		let updated = false;

		await access.processFrontMatter(note, (frontmatter) => {
			const existing = Object.keys(frontmatter);

			if (existing.length === 0 && !options.createMissing) {
				return;
			}

			const { order, changed } = computePropertyOrder(existing, templateProperties, {
				...options,
				values: frontmatter,
			});

			if (!changed) {
				return;
			}

			applyPropertyOrder(frontmatter, order);
			updated = true;
		});

		return { outcome: updated ? "updated" : "unchanged" };
	} catch (error) {
		return { outcome: "error", error };
	}
}
