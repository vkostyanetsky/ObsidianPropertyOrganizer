import type { UnlistedPropertiesBehavior } from "./settings";

export interface PropertyOrder {
	/** The full list of property names in the order they should be written. */
	order: string[];
	/** Whether `order` differs from the order the note currently has. */
	changed: boolean;
}

export interface PropertyOrderOptions {
	/** Include template properties the note does not have yet. */
	createMissing: boolean;
	/** What to do with properties the template does not list. */
	unlisted: UnlistedPropertiesBehavior;
	/**
	 * Current property values, keyed by name. Needed by `remove-empty` to tell
	 * an empty property from a filled one; when it is missing, no unlisted
	 * property can be proven empty and all of them are kept.
	 */
	values?: Record<string, unknown>;
}

/**
 * Tells whether a YAML value counts as empty: `null` (an Obsidian property
 * without a value), a blank string, an empty list or an empty map. Everything
 * else — including `false`, `0` and dates — is a real value.
 */
export function isEmptyPropertyValue(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	if (typeof value === "string") {
		return value.trim().length === 0;
	}

	if (Array.isArray(value)) {
		return value.length === 0;
	}

	if (value instanceof Date) {
		return false;
	}

	if (typeof value === "object") {
		return Object.keys(value).length === 0;
	}

	return false;
}

/**
 * Parses a user-entered, comma-separated property list.
 *
 * Names are trimmed, empty entries are dropped, and only the first occurrence
 * of a repeated name is kept. Names are case-sensitive and never rewritten.
 */
export function parsePropertyList(raw: string): string[] {
	const names: string[] = [];
	const seen = new Set<string>();

	for (const part of raw.split(",")) {
		const name = part.trim();

		if (name.length === 0 || seen.has(name)) {
			continue;
		}

		seen.add(name);
		names.push(name);
	}

	return names;
}

/**
 * Computes the target property order for a note.
 *
 * Template properties come first, in template order. Properties the template
 * does not list are kept, dropped when empty, or dropped outright, following
 * `options.unlisted`; the ones that survive keep their original relative order
 * after the listed ones. When `options.createMissing` is true, template
 * properties absent from the note are included as well.
 *
 * Properties listed in the template are never dropped, empty or not.
 */
export function computePropertyOrder(
	existing: string[],
	template: string[],
	options: PropertyOrderOptions,
): PropertyOrder {
	const existingSet = new Set(existing);
	const templateSet = new Set(template);

	const listed = template.filter((name) => options.createMissing || existingSet.has(name));
	const unlisted = existing.filter(
		(name) => !templateSet.has(name) && keepsUnlisted(name, options),
	);
	const order = [...listed, ...unlisted];

	const changed =
		order.length !== existing.length || order.some((name, index) => name !== existing[index]);

	return { order, changed };
}

/** Whether an unlisted property survives the configured behavior. */
function keepsUnlisted(name: string, options: PropertyOrderOptions): boolean {
	switch (options.unlisted) {
		case "remove-all":
			return false;
		case "remove-empty":
			return options.values === undefined || !isEmptyPropertyValue(options.values[name]);
		case "keep":
			return true;
	}
}

/**
 * Rewrites `frontmatter` in place so that its keys follow `order`.
 *
 * Values are moved as-is; keys in `order` that the note does not have yet are
 * created with a `null` value, which Obsidian writes as an empty property.
 * Keys the note has but `order` does not are removed.
 */
export function applyPropertyOrder(frontmatter: Record<string, unknown>, order: string[]): void {
	const values = new Map<string, unknown>();

	for (const key of Object.keys(frontmatter)) {
		values.set(key, frontmatter[key]);
		delete frontmatter[key];
	}

	for (const key of order) {
		frontmatter[key] = values.has(key) ? values.get(key) : null;
	}
}
