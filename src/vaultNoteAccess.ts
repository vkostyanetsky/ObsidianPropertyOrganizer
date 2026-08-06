import type { App, TFile } from "obsidian";

import type { CachedFrontMatter, NoteAccess } from "./organizer";

/**
 * Older Obsidian versions exposed the frontmatter block position as a
 * `position` entry of the cached frontmatter object. It is not a real
 * property, so it must not take part in ordering decisions.
 */
export function isPositionEntry(key: string, value: unknown): boolean {
	return (
		key === "position" &&
		typeof value === "object" &&
		value !== null &&
		"start" in value &&
		"end" in value
	);
}

/** Reads and writes note frontmatter through the public Obsidian API. */
export class VaultNoteAccess implements NoteAccess<TFile> {
	constructor(private readonly app: App) {}

	getCachedFrontMatter(note: TFile): CachedFrontMatter | null {
		const cache = this.app.metadataCache.getFileCache(note);

		if (cache === null) {
			return null;
		}

		const frontmatter = cache.frontmatter;

		if (frontmatter === undefined) {
			// A block that is present but absent from the cache failed to
			// parse. Let the note be read so the YAML error surfaces.
			return cache.frontmatterPosition === undefined ? { exists: false, properties: {} } : null;
		}

		const properties: Record<string, unknown> = {};

		for (const key of Object.keys(frontmatter)) {
			if (!isPositionEntry(key, frontmatter[key])) {
				properties[key] = frontmatter[key];
			}
		}

		return { exists: true, properties };
	}

	async processFrontMatter(
		note: TFile,
		fn: (frontmatter: Record<string, unknown>) => void,
	): Promise<void> {
		await this.app.fileManager.processFrontMatter(note, fn);
	}
}
