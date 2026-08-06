import type { App } from "obsidian";

import { isPositionEntry } from "./vaultNoteAccess";

/**
 * The frontmatter property names in use across the vault, in alphabetical
 * order.
 *
 * Names come from the metadata cache, so collecting them reads no file. The
 * result is kept because the settings ask for it on every keystroke, and is
 * dropped whenever the cache reports a change.
 */
export class VaultPropertyNames {
	private collected: string[] | null = null;

	constructor(private readonly app: App) {}

	/** Forgets the collected names, so the next lookup reads the cache again. */
	invalidate(): void {
		this.collected = null;
	}

	get(): string[] {
		this.collected ??= this.collect();

		return this.collected;
	}

	private collect(): string[] {
		const names = new Set<string>();

		for (const note of this.app.vault.getMarkdownFiles()) {
			const frontmatter = this.app.metadataCache.getFileCache(note)?.frontmatter;

			if (frontmatter === undefined) {
				continue;
			}

			for (const key of Object.keys(frontmatter)) {
				if (!isPositionEntry(key, frontmatter[key])) {
					names.add(key);
				}
			}
		}

		return [...names].sort((first, second) => first.localeCompare(second));
	}
}
