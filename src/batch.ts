import { organizeNote } from "./organizer";
import type { NoteAccess, OrganizeOptions } from "./organizer";

export interface OrganizeSummary {
	updated: number;
	unchanged: number;
	skipped: number;
	errors: number;
}

export interface BatchOptions<TNote> extends OrganizeOptions {
	/** Property order for the note, or null when no template matches it. */
	resolveTemplate: (note: TNote) => string[] | null;
	access: NoteAccess<TNote>;
	/** Called once per failed note so the caller can log it. */
	onError?: (note: TNote, error: unknown) => void;
}

export function createEmptySummary(): OrganizeSummary {
	return { updated: 0, unchanged: 0, skipped: 0, errors: 0 };
}

export function formatSummary(summary: OrganizeSummary): string {
	return (
		`Property Organizer: ${summary.updated} notes updated, ` +
		`${summary.unchanged} unchanged, ${summary.skipped} skipped, ${summary.errors} errors.`
	);
}

/**
 * Organizes notes one after another. A failing note is counted and reported,
 * never allowed to stop the rest of the batch.
 */
export async function organizeNotes<TNote>(
	notes: TNote[],
	options: BatchOptions<TNote>,
): Promise<OrganizeSummary> {
	const summary = createEmptySummary();
	const noteOptions: OrganizeOptions = {
		createMissing: options.createMissing,
		unlisted: options.unlisted,
	};

	for (const note of notes) {
		const templateProperties = options.resolveTemplate(note);

		if (templateProperties === null) {
			summary.skipped += 1;
			continue;
		}

		const result = await organizeNote(note, templateProperties, noteOptions, options.access);

		switch (result.outcome) {
			case "updated":
				summary.updated += 1;
				break;
			case "unchanged":
				summary.unchanged += 1;
				break;
			case "skipped":
				summary.skipped += 1;
				break;
			case "error":
				summary.errors += 1;
				options.onError?.(note, result.error);
				break;
		}
	}

	return summary;
}
