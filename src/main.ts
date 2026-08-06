import { MarkdownView, Notice, Plugin } from "obsidian";
import type { TFile } from "obsidian";

import { formatSummary, organizeNotes } from "./batch";
import type { OrganizeSummary } from "./batch";
import { organizeNote } from "./organizer";
import type { OrganizeOptions } from "./organizer";
import { parsePropertyList } from "./propertyOrder";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import type { PropertyOrganizerSettings } from "./settings";
import { PropertyOrganizerSettingTab } from "./settingsTab";
import { findTemplateForPath } from "./templateMatching";
import { VaultNoteAccess } from "./vaultNoteAccess";
import { VaultPropertyNames } from "./vaultProperties";

/**
 * How long to wait for the metadata cache to report itself resolved before
 * starting the initial run anyway.
 */
const METADATA_CACHE_TIMEOUT_MS = 10000;

export default class PropertyOrganizerPlugin extends Plugin {
	settings: PropertyOrganizerSettings = DEFAULT_SETTINGS;

	private readonly noteAccess = new VaultNoteAccess(this.app);
	private readonly propertyNames = new VaultPropertyNames(this.app);
	private initialRunStarted = false;
	private initialRunWindow: Window | null = null;
	private initialRunTimeout: number | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new PropertyOrganizerSettingTab(this.app, this, this.propertyNames));
		this.watchPropertyNames();

		this.addCommand({
			id: "sort-properties-in-all-notes",
			name: "Sort properties in all notes",
			callback: () => {
				this.run(this.sortAllNotes());
			},
		});

		this.addCommand({
			id: "sort-properties-in-current-note",
			name: "Sort properties in current note",
			checkCallback: (checking) => {
				const file = this.getActiveNote();

				if (file === null) {
					return false;
				}

				if (!checking) {
					this.run(this.sortNote(file));
				}

				return true;
			},
		});

		this.scheduleInitialRun();
	}

	onunload(): void {
		this.clearInitialRunTimeout();
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async loadSettings(): Promise<void> {
		const data: unknown = await this.loadData();

		this.settings = normalizeSettings(data);
	}

	/**
	 * Keeps the property names offered by the settings in step with the vault:
	 * a note whose frontmatter changed, or that is gone, can have been the only
	 * one using a name.
	 */
	private watchPropertyNames(): void {
		const invalidate = () => {
			this.propertyNames.invalidate();
		};

		this.registerEvent(this.app.metadataCache.on("changed", invalidate));
		this.registerEvent(this.app.metadataCache.on("deleted", invalidate));
	}

	/** The note of the active Markdown view, never a previously active one. */
	private getActiveNote(): TFile | null {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		return view?.file ?? null;
	}

	private async sortAllNotes(): Promise<void> {
		const summary = await this.organizeVault();

		new Notice(formatSummary(summary));
	}

	private async sortNote(file: TFile): Promise<void> {
		const template = findTemplateForPath(this.settings.templates, file.path);

		if (template === null) {
			new Notice("No matching template for the current note.");

			return;
		}

		const result = await organizeNote(
			file,
			parsePropertyList(template.properties),
			this.organizeOptions(),
			this.noteAccess,
		);

		switch (result.outcome) {
			case "updated":
				new Notice("Properties sorted.");
				break;
			case "unchanged":
			case "skipped":
				new Notice("Properties are already organized.");
				break;
			case "error":
				console.error(`Property Organizer: unable to process ${file.path}.`, result.error);
				new Notice("The current note could not be processed. See the console for details.");
				break;
		}
	}

	/** The current settings in the shape the organizing logic expects. */
	private organizeOptions(): OrganizeOptions {
		return {
			createMissing: this.settings.createMissingProperties,
			unlisted: this.settings.unlistedProperties,
		};
	}

	private async organizeVault(): Promise<OrganizeSummary> {
		return organizeNotes(this.app.vault.getMarkdownFiles(), {
			resolveTemplate: (file) => {
				const template = findTemplateForPath(this.settings.templates, file.path);

				return template === null ? null : parsePropertyList(template.properties);
			},
			...this.organizeOptions(),
			access: this.noteAccess,
			onError: (file, error) => {
				console.error(`Property Organizer: unable to process ${file.path}.`, error);
			},
		});
	}

	/**
	 * Sorting runs once per vault load, and only when the user asked for it.
	 * When the layout is already ready the plugin is being enabled or reloaded
	 * by hand, and nothing is scheduled.
	 */
	private scheduleInitialRun(): void {
		if (!this.settings.processAllNotesOnStartup) {
			return;
		}

		if (this.app.workspace.layoutReady) {
			return;
		}

		this.app.workspace.onLayoutReady(() => {
			this.waitForMetadataCache();
		});
	}

	private waitForMetadataCache(): void {
		const start = () => {
			this.startInitialRun();
		};

		// "resolved" also fires after the plugin's own writes, so the run is
		// guarded by a flag instead of being unsubscribed from here.
		this.registerEvent(this.app.metadataCache.on("resolved", start));

		const win = activeWindow;

		this.initialRunWindow = win;
		this.initialRunTimeout = win.setTimeout(start, METADATA_CACHE_TIMEOUT_MS);
	}

	private startInitialRun(): void {
		if (this.initialRunStarted) {
			return;
		}

		this.initialRunStarted = true;
		this.clearInitialRunTimeout();
		this.run(this.runInitialSort());
	}

	private async runInitialSort(): Promise<void> {
		const summary = await this.organizeVault();

		if (summary.updated > 0 || summary.errors > 0) {
			new Notice(formatSummary(summary));
		}
	}

	private clearInitialRunTimeout(): void {
		if (this.initialRunWindow !== null && this.initialRunTimeout !== null) {
			this.initialRunWindow.clearTimeout(this.initialRunTimeout);
		}

		this.initialRunWindow = null;
		this.initialRunTimeout = null;
	}

	private run(task: Promise<void>): void {
		task.catch((error: unknown) => {
			console.error("Property Organizer: unexpected failure.", error);
		});
	}
}
