export interface PropertyOrder {
	/** The full list of property names in the order they should be written. */
	order: string[];
	/** Whether `order` differs from the order the note currently has. */
	changed: boolean;
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
 * Template properties come first, in template order. Everything else keeps its
 * original relative order after them. When `createMissing` is true, template
 * properties absent from the note are included as well.
 */
export function computePropertyOrder(
	existing: string[],
	template: string[],
	createMissing: boolean,
): PropertyOrder {
	const existingSet = new Set(existing);
	const templateSet = new Set(template);

	const listed = template.filter((name) => createMissing || existingSet.has(name));
	const unlisted = existing.filter((name) => !templateSet.has(name));
	const order = [...listed, ...unlisted];

	const changed =
		order.length !== existing.length || order.some((name, index) => name !== existing[index]);

	return { order, changed };
}

/**
 * Rewrites `frontmatter` in place so that its keys follow `order`.
 *
 * Values are moved as-is; keys in `order` that the note does not have yet are
 * created with a `null` value, which Obsidian writes as an empty property.
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
