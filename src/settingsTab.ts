import { PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";

import { FolderSuggest } from "./folderSuggest";
import { createEmptyTemplate, parseUnlistedPropertiesBehavior } from "./settings";
import type { FolderTemplate } from "./settings";
import type PropertyOrganizerPlugin from "./main";

export class PropertyOrganizerSettingTab extends PluginSettingTab {
	private readonly plugin: PropertyOrganizerPlugin;
	private templatesEl: HTMLElement | null = null;

	constructor(app: App, plugin: PropertyOrganizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Create missing properties")
			.setDesc(
				"Add properties that a template lists but a note does not have yet. " +
					"They are created empty, and existing values are never touched.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.createMissingProperties).onChange((value) => {
					this.plugin.settings.createMissingProperties = value;
					this.persist();
				}),
			);

		new Setting(containerEl)
			.setName("Unlisted properties")
			.setDesc("Choose how to handle properties that are not included in the matched template.")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						keep: "Keep all",
						"remove-empty": "Remove if empty",
						"remove-all": "Remove all",
					})
					.setValue(this.plugin.settings.unlistedProperties)
					.onChange((value) => {
						this.plugin.settings.unlistedProperties =
							parseUnlistedPropertiesBehavior(value);
						this.persist();
					}),
			);

		new Setting(containerEl)
			.setName("Folder templates")
			.setDesc(this.createHints())
			.setHeading();

		this.templatesEl = containerEl.createDiv({ cls: "property-organizer-templates" });
		this.renderTemplates();

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText("Add template")
				.setCta()
				.onClick(() => {
					this.plugin.settings.templates.push(createEmptyTemplate());
					this.persist();
					this.renderTemplates();
				}),
		);
	}

	hide(): void {
		this.templatesEl = null;
		super.hide();
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

	private renderTemplates(): void {
		const container = this.templatesEl;

		if (container === null) {
			return;
		}

		container.empty();

		const templates = this.plugin.settings.templates;

		if (templates.length === 0) {
			container.createDiv({
				cls: "property-organizer-empty",
				text: "No templates yet. Notes stay untouched until you add one.",
			});

			return;
		}

		templates.forEach((template, index) => {
			this.renderTemplateRow(container, template, index, templates.length);
		});
	}

	private renderTemplateRow(
		container: HTMLElement,
		template: FolderTemplate,
		index: number,
		total: number,
	): void {
		const setting = new Setting(container).setClass("property-organizer-template");

		setting.addExtraButton((button) =>
			button
				.setIcon("chevron-up")
				.setTooltip("Move up")
				.setDisabled(index === 0)
				.onClick(() => {
					this.moveTemplate(index, index - 1);
				}),
		);

		setting.addExtraButton((button) =>
			button
				.setIcon("chevron-down")
				.setTooltip("Move down")
				.setDisabled(index === total - 1)
				.onClick(() => {
					this.moveTemplate(index, index + 1);
				}),
		);

		setting.addSearch((search) => {
			search
				.setPlaceholder("Folder, empty for the vault root")
				.setValue(template.folder)
				.onChange((value) => {
					template.folder = value;
					this.persist();
				});

			search.inputEl.addClass("property-organizer-folder");
			search.inputEl.setAttribute("aria-label", "Template folder");

			new FolderSuggest(this.app, search.inputEl, (folderPath) => {
				template.folder = folderPath;
				this.persist();
			});
		});

		setting.addText((text) => {
			text
				.setPlaceholder("Example: type, status, created")
				.setValue(template.properties)
				.onChange((value) => {
					template.properties = value;
					this.persist();
				});

			text.inputEl.addClass("property-organizer-properties");
			text.inputEl.setAttribute("aria-label", "Property order");
		});

		setting.addExtraButton((button) =>
			button
				.setIcon("trash-2")
				.setTooltip("Delete template")
				.onClick(() => {
					this.plugin.settings.templates.splice(index, 1);
					this.persist();
					this.renderTemplates();
				}),
		);
	}

	private moveTemplate(from: number, to: number): void {
		const templates = this.plugin.settings.templates;

		if (to < 0 || to >= templates.length) {
			return;
		}

		const [moved] = templates.splice(from, 1);

		templates.splice(to, 0, moved);
		this.persist();
		this.renderTemplates();
	}

	private persist(): void {
		this.plugin.saveSettings().catch((error: unknown) => {
			console.error("Property Organizer: unable to save settings.", error);
		});
	}
}
