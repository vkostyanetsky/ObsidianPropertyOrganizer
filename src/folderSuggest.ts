import { AbstractInputSuggest, TFolder, Vault } from "obsidian";
import type { App } from "obsidian";

const MAX_SUGGESTIONS = 50;

/** Suggests vault folders while the user types a template path. */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(
		app: App,
		textInputEl: HTMLInputElement,
		private readonly onPick: (folderPath: string) => void,
	) {
		super(app, textInputEl);

		this.onSelect((folder) => {
			const folderPath = folder.path === "/" ? "" : folder.path;

			this.setValue(folderPath);
			this.onPick(folderPath);
			this.close();
		});
	}

	protected getSuggestions(query: string): TFolder[] {
		const search = query.trim().toLowerCase();
		const folders: TFolder[] = [];

		Vault.recurseChildren(this.app.vault.getRoot(), (file) => {
			if (file instanceof TFolder && file.path.toLowerCase().includes(search)) {
				folders.push(file);
			}
		});

		return folders.slice(0, MAX_SUGGESTIONS);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}
}
