/**
 * Editing helpers for the comma-separated property list of a template row.
 *
 * The list is stored as the raw string the user typed, so completion works on
 * that string: it looks at the name being typed around the caret and rewrites
 * that name only, leaving the other entries and the separators as they are.
 */

/** The entry of a property list the caret is currently in. */
export interface PropertyListSegment {
	/** Index of the first character of the entry. */
	start: number;
	/** Index just past the last character of the entry. */
	end: number;
	/** The name being typed, without the spaces around it. */
	query: string;
	/** The non-empty names of every other entry, trimmed. */
	otherNames: string[];
}

/**
 * Finds the entry `caret` sits in, delimited by the commas around it.
 *
 * A caret next to a comma belongs to the entry before it, which is what makes
 * completion continue the name just typed rather than start the next one.
 */
export function findPropertyListSegment(value: string, caret: number): PropertyListSegment {
	const position = Math.min(Math.max(caret, 0), value.length);
	const start = position === 0 ? 0 : value.lastIndexOf(",", position - 1) + 1;
	const nextComma = value.indexOf(",", position);
	const end = nextComma === -1 ? value.length : nextComma;

	return {
		start,
		end,
		query: value.slice(start, end).trim(),
		otherNames: collectOtherNames(value, start),
	};
}

/**
 * Replaces the entry with `name`, returning the new value and the caret
 * position right after the inserted name, so the list can be typed on.
 *
 * The spaces before the name are kept, which preserves the `a, b` spacing of a
 * list the user has already started; the ones after it are dropped.
 */
export function replacePropertyListSegment(
	value: string,
	segment: PropertyListSegment,
	name: string,
): { value: string; caret: number } {
	const entry = value.slice(segment.start, segment.end);
	const indent = entry.slice(0, entry.length - entry.trimStart().length);
	const head = `${value.slice(0, segment.start)}${indent}${name}`;

	return { value: `${head}${value.slice(segment.end)}`, caret: head.length };
}

/** The names of the entries other than the one starting at `start`. */
function collectOtherNames(value: string, start: number): string[] {
	const names: string[] = [];
	let index = 0;

	for (const entry of value.split(",")) {
		const entryStart = index;

		// Past the entry and its trailing comma.
		index += entry.length + 1;

		const name = entry.trim();

		if (entryStart !== start && name.length > 0) {
			names.push(name);
		}
	}

	return names;
}
