import {
	AbstractInputSuggest,
	prepareFuzzySearch,
	renderResults,
	sortSearchResults,
} from "obsidian";
import type { App, FuzzyMatch, SearchResult } from "obsidian";

import { findPropertyListSegment, replacePropertyListSegment } from "./propertyListInput";
import type { PropertyListSegment } from "./propertyListInput";

const MAX_SUGGESTIONS = 50;

/** A property name offered for the entry being typed. */
interface PropertySuggestion {
	name: string;
	/** The match to highlight, or null when nothing has been typed yet. */
	match: SearchResult | null;
}

/**
 * Suggests the property names already used in the vault while the user types
 * one entry of a comma-separated property list.
 *
 * Filtering, keyboard and pointer selection are Obsidian's own, as is the
 * fuzzy match the names are ranked and highlighted by. What the class adds is
 * that the field holds a list rather than a single value: suggestions are made
 * for the entry the caret is in, whichever one it is, and choosing one rewrites
 * that entry alone. Names already listed elsewhere in the field are left out,
 * since a repeated name has no effect on the order; a name the vault does not
 * have yet is simply typed, as no suggestion has to be accepted.
 */
export class PropertySuggest extends AbstractInputSuggest<PropertySuggestion> {
	/** Start of the entry the suggestions on screen were made for, or null when none are. */
	private shownStart: number | null = null;

	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
		private readonly names: () => string[],
		private readonly onPick: (value: string) => void,
	) {
		super(app, inputEl);

		this.watchCaret();

		this.onSelect((suggestion) => {
			const { value, caret } = replacePropertyListSegment(
				this.inputEl.value,
				this.activeSegment(),
				suggestion.name,
			);

			this.setValue(value);

			// The component sets the value without notifying its own listeners,
			// so the settings are saved from here.
			this.onPick(value);

			this.inputEl.focus();
			this.inputEl.setSelectionRange(caret, caret);
			this.close();
		});
	}

	protected getSuggestions(): PropertySuggestion[] {
		const segment = this.activeSegment();

		this.shownStart = segment.start;

		const listed = new Set(segment.otherNames);
		const candidates = this.names().filter((name) => !listed.has(name));

		if (segment.query.length === 0) {
			return candidates.slice(0, MAX_SUGGESTIONS).map((name) => ({ name, match: null }));
		}

		const search = prepareFuzzySearch(segment.query);
		const matches: FuzzyMatch<string>[] = [];

		for (const name of candidates) {
			const match = search(name);

			if (match !== null) {
				matches.push({ item: name, match });
			}
		}

		sortSearchResults(matches);

		return matches.slice(0, MAX_SUGGESTIONS).map(({ item, match }) => ({ name: item, match }));
	}

	close(): void {
		this.shownStart = null;
		super.close();
	}

	renderSuggestion(suggestion: PropertySuggestion, el: HTMLElement): void {
		if (suggestion.match === null) {
			el.setText(suggestion.name);
		} else {
			renderResults(el, suggestion.name, suggestion.match);
		}
	}

	/**
	 * Keeps the suggestions on the entry the caret is in.
	 *
	 * The component asks for them when the field takes focus, and the browser
	 * places the caret only after that event has been handled: read there, the
	 * caret would still be where it was, which for a field just clicked into is
	 * the start of the list. So the field is asked again once the focus event is
	 * over, and on every later move of the caret — a click, an arrow key, `Home`
	 * or `End` — none of which change the value the component watches.
	 *
	 * The refresh is the `input` event Obsidian's own suggestions use to reopen
	 * themselves; the component ignores it unless the field has focus.
	 */
	private watchCaret(): void {
		this.inputEl.addEventListener("focus", () => {
			// Whatever the suggestions taken on focus were, they were made for
			// the wrong entry, so the closed list is reopened as well.
			this.inputEl.win.setTimeout(() => {
				this.refreshSuggestions(true);
			});
		});

		const follow = () => {
			this.refreshSuggestions(false);
		};

		this.inputEl.addEventListener("pointerup", follow);
		this.inputEl.addEventListener("keyup", follow);
	}

	/**
	 * Asks the component for the suggestions of the entry the caret is in.
	 *
	 * Unless `reopen` says otherwise, a closed list stays closed: it was closed
	 * by `Esc` or by having nothing to show, and moving the caret is no reason
	 * to bring it back.
	 */
	private refreshSuggestions(reopen: boolean): void {
		if (!this.inputEl.isActiveElement()) {
			return;
		}

		if (!reopen && (this.shownStart === null || this.shownStart === this.activeSegment().start)) {
			return;
		}

		this.inputEl.trigger("input");
	}

	/**
	 * The entry of the list the caret is in. Read from the field on demand, so
	 * that it is the entry the user is working on both when the suggestions are
	 * computed and when one of them is chosen.
	 */
	private activeSegment(): PropertyListSegment {
		const value = this.inputEl.value;

		return findPropertyListSegment(value, this.inputEl.selectionStart ?? value.length);
	}
}
