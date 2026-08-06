import { PluginSettingTab } from "obsidian";
import type { App, Setting, SettingDefinition, SettingDefinitionItem } from "obsidian";

import { FolderSuggest } from "./folderSuggest";
import { PropertySuggest } from "./propertySuggest";
import { createEmptyTemplate, parseUnlistedPropertiesBehavior } from "./settings";
import type { FolderTemplate } from "./settings";
import type PropertyOrganizerPlugin from "./main";
import type { VaultPropertyNames } from "./vaultProperties";

export class PropertyOrganizerSettingTab extends PluginSettingTab {
	private readonly plugin: PropertyOrganizerPlugin;
	private readonly propertyNames: VaultPropertyNames;

	constructor(app: App, plugin: PropertyOrganizerPlugin, propertyNames: VaultPropertyNames) {
		super(app, plugin);
		this.plugin = plugin;
		this.propertyNames = propertyNames;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Process all notes on vault startup",
				desc:
					"Sort the properties of every matching note once the vault has finished loading. " +
					"Off by default; the commands stay available either way.",
				control: {
					type: "toggle",
					key: "processAllNotesOnStartup",
					defaultValue: false,
				},
			},
			{
				name: "Create missing properties",
				desc:
					"Add properties that a template lists but a note does not have yet. " +
					"They are created empty, and existing values are never touched.",
				control: {
					type: "toggle",
					key: "createMissingProperties",
					defaultValue: false,
				},
			},
			{
				name: "Unlisted properties",
				desc: "Choose how to handle properties that are not included in the matched template.",
				control: {
					type: "dropdown",
					key: "unlistedProperties",
					defaultValue: "keep",
					options: {
						keep: "Keep all",
						"remove-empty": "Remove if empty",
						"remove-all": "Remove all",
					},
				},
			},
			{
				type: "list",
				heading: "Folder templates",
				cls: "property-organizer-templates",
				emptyState: "No templates yet. Notes stay untouched until you add one.",
				items: this.plugin.settings.templates.map((template) => this.templateRow(template)),
				onReorder: (from, to) => {
					this.moveTemplate(from, to);
				},
				onDelete: (index) => {
					this.deleteTemplate(index);
				},
				addItem: {
					name: "Add template",
					action: () => {
						this.addTemplate();
					},
				},
			},
			{
				name: "How templates are matched",
				desc: this.createHints(),
			},
		];
	}

	getControlValue(key: string): unknown {
		switch (key) {
			case "processAllNotesOnStartup":
				return this.plugin.settings.processAllNotesOnStartup;
			case "createMissingProperties":
				return this.plugin.settings.createMissingProperties;
			case "unlistedProperties":
				return this.plugin.settings.unlistedProperties;
			default:
				return undefined;
		}
	}

	setControlValue(key: string, value: unknown): Promise<void> {
		switch (key) {
			case "processAllNotesOnStartup":
				this.plugin.settings.processAllNotesOnStartup = value === true;
				break;
			case "createMissingProperties":
				this.plugin.settings.createMissingProperties = value === true;
				break;
			case "unlistedProperties":
				this.plugin.settings.unlistedProperties = parseUnlistedPropertiesBehavior(value);
				break;
		}

		return this.plugin.saveSettings();
	}

	/**
	 * A template as one editable row of the list, holding both of its fields.
	 *
	 * The row is rendered imperatively because a declarative definition carries
	 * a single control, while a template needs two. It stays a plain row of the
	 * list rather than a navigable page, which is what gives it the delete and
	 * reorder affordances the list provides.
	 */
	private templateRow(template: FolderTemplate): SettingDefinition {
		return {
			// Hidden by the stylesheet to leave the row to its two fields; kept
			// meaningful because the settings search indexes it.
			name: template.folder.trim() === "" ? "Vault root" : template.folder,
			aliases: [template.properties],
			render: (setting: Setting) => {
				setting.setClass("property-organizer-template");

				let folderSuggest: FolderSuggest | null = null;
				let propertySuggest: PropertySuggest | null = null;

				setting.addSearch((search) => {
					search
						.setPlaceholder("Folder, empty for the vault root")
						.setValue(template.folder)
						.onChange((value) => {
							template.folder = value;
							this.save();
						});

					search.inputEl.addClass("property-organizer-folder");
					search.inputEl.setAttribute("aria-label", "Template folder");

					folderSuggest = new FolderSuggest(this.app, search.inputEl, (folderPath) => {
						template.folder = folderPath;
						this.save();
					});
				});

				setting.addText((text) => {
					text
						.setPlaceholder("Example: type, status, created")
						.setValue(template.properties)
						.onChange((value) => {
							// The suggestions ask the field to reconsider them with an
							// `input` event, which lands here as well; saving is left to
							// the edits that do change the list.
							if (value === template.properties) {
								return;
							}

							template.properties = value;
							this.save();
						});

					text.inputEl.addClass("property-organizer-properties");
					text.inputEl.setAttribute("aria-label", "Property order");

					propertySuggest = new PropertySuggest(
						this.app,
						text.inputEl,
						() => this.propertyNames.get(),
						(value) => {
							template.properties = value;
							this.save();
						},
					);
				});

				return () => {
					folderSuggest?.close();
					propertySuggest?.close();
				};
			},
		};
	}

	private createHints(): DocumentFragment {
		return createFragment((fragment) => {
			const list = fragment.createEl("ul", { cls: "property-organizer-hints" });

			list.createEl("li", {
				text: "A template applies to the notes of its folder and of every subfolder.",
			});
			list.createEl("li", {
				text: "Leave the folder empty to match the whole vault and use the template as a fallback.",
			});
			list.createEl("li", {
				text: "When several templates match a note, the first one in this list wins.",
			});
			list.createEl("li", {
				text: "Properties that are not listed follow the listed ones, unless the setting above removes them.",
			});
		});
	}

	private addTemplate(): void {
		this.plugin.settings.templates.push(createEmptyTemplate());
		this.persist();
	}

	private deleteTemplate(index: number): void {
		this.plugin.settings.templates.splice(index, 1);
		this.persist();
	}

	private moveTemplate(from: number, to: number): void {
		const templates = this.plugin.settings.templates;

		if (to < 0 || to >= templates.length) {
			return;
		}

		const [moved] = templates.splice(from, 1);

		templates.splice(to, 0, moved);
		this.persist();
	}

	/**
	 * Saves the settings and rebuilds the definitions, which is what makes an
	 * added, deleted or reordered template appear in its new place.
	 */
	private persist(): void {
		this.update();
		this.save();
	}

	/**
	 * Saves without rebuilding, for edits made inside a row: a rebuild on every
	 * keystroke would replace the input the user is typing into.
	 */
	private save(): void {
		this.plugin.saveSettings().catch((error: unknown) => {
			console.error("Property Organizer: unable to save settings.", error);
		});
	}
}
