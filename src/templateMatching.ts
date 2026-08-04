import { normalizePath } from "obsidian";

import type { FolderTemplate } from "./settings";

const VAULT_ROOT = "/";

/**
 * Normalizes a user-entered folder path with Obsidian's own helper.
 * An empty (or whitespace-only) path becomes the vault root, `/`.
 */
export function normalizeTemplateFolder(folder: string): string {
	return normalizePath(folder.trim());
}

/**
 * Tells whether a note lives directly in `folder` or in any of its subfolders.
 * Comparison happens on whole path segments, so `Projects` does not match
 * `Projects-old/note.md`.
 */
export function folderMatchesPath(folder: string, filePath: string): boolean {
	const normalizedFolder = normalizeTemplateFolder(folder);

	if (normalizedFolder === VAULT_ROOT) {
		return true;
	}

	return filePath.startsWith(`${normalizedFolder}/`);
}

/** Returns the first template whose folder matches the note, or null. */
export function findTemplateForPath(
	templates: FolderTemplate[],
	filePath: string,
): FolderTemplate | null {
	for (const template of templates) {
		if (folderMatchesPath(template.folder, filePath)) {
			return template;
		}
	}

	return null;
}
