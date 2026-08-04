/**
 * A single folder template: a folder path plus the desired property order
 * for every note inside that folder (and its subfolders).
 */
export interface FolderTemplate {
	/** Vault-relative folder path. An empty string means the vault root. */
	folder: string;
	/** Comma-separated property names, in the desired order. */
	properties: string;
}

export interface PropertyOrganizerSettings {
	/** Create properties listed in a template but missing from the note. */
	createMissingProperties: boolean;
	/** Templates in priority order: the first match wins. */
	templates: FolderTemplate[];
}

export const DEFAULT_SETTINGS: PropertyOrganizerSettings = {
	createMissingProperties: false,
	templates: [],
};

export function createEmptyTemplate(): FolderTemplate {
	return { folder: "", properties: "" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseTemplate(value: unknown): FolderTemplate | null {
	if (!isRecord(value)) {
		return null;
	}

	const folder = typeof value.folder === "string" ? value.folder : "";
	const properties = typeof value.properties === "string" ? value.properties : "";

	return { folder, properties };
}

/**
 * Turns whatever was persisted by an earlier version (or hand-edited into
 * `data.json`) into a well-formed settings object.
 */
export function normalizeSettings(raw: unknown): PropertyOrganizerSettings {
	const data = isRecord(raw) ? raw : {};
	const rawTemplates = Array.isArray(data.templates) ? data.templates : [];
	const templates: FolderTemplate[] = [];

	for (const rawTemplate of rawTemplates) {
		const template = parseTemplate(rawTemplate);

		if (template !== null) {
			templates.push(template);
		}
	}

	return {
		createMissingProperties: data.createMissingProperties === true,
		templates,
	};
}
