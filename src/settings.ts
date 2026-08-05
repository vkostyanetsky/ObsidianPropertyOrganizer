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

/**
 * What to do with the frontmatter properties of a matched note that the
 * matching template does not list.
 *
 * - `keep` — leave them alone, after the listed ones.
 * - `remove-empty` — drop the ones whose value is empty.
 * - `remove-all` — drop every one of them.
 */
export type UnlistedPropertiesBehavior = "keep" | "remove-empty" | "remove-all";

const UNLISTED_PROPERTIES_BEHAVIORS: readonly UnlistedPropertiesBehavior[] = [
	"keep",
	"remove-empty",
	"remove-all",
];

export interface PropertyOrganizerSettings {
	/** Organize every matching note once the vault has finished loading. */
	processAllNotesOnStartup: boolean;
	/** Create properties listed in a template but missing from the note. */
	createMissingProperties: boolean;
	/** How to treat properties the matching template does not list. */
	unlistedProperties: UnlistedPropertiesBehavior;
	/** Templates in priority order: the first match wins. */
	templates: FolderTemplate[];
}

export const DEFAULT_SETTINGS: PropertyOrganizerSettings = {
	processAllNotesOnStartup: false,
	createMissingProperties: false,
	unlistedProperties: "keep",
	templates: [],
};

/**
 * Narrows an arbitrary value to a known behavior. Anything else — including
 * the field being absent in settings saved by an earlier version — becomes
 * `keep`, the behavior the plugin had before the setting existed.
 */
export function parseUnlistedPropertiesBehavior(value: unknown): UnlistedPropertiesBehavior {
	return UNLISTED_PROPERTIES_BEHAVIORS.find((behavior) => behavior === value) ?? "keep";
}

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
		processAllNotesOnStartup: data.processAllNotesOnStartup === true,
		createMissingProperties: data.createMissingProperties === true,
		unlistedProperties: parseUnlistedPropertiesBehavior(data.unlistedProperties),
		templates,
	};
}
