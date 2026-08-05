# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 - 2026-08-04

### Added

* Sorting of the YAML frontmatter properties of a note into the order described for its folder. Values, property names and their casing are left untouched, and the content after the frontmatter is never rewritten.
* The **Folder templates** setting, an ordered list of rows. Each row is a folder together with a comma-separated list of property names in the order they are meant to be written, and has **Move up**, **Move down** and delete buttons; the folder field suggests the folders of the vault. Changes are saved as they are made.
* A template applies to every Markdown note lying directly in its folder and in any of its subfolders, so a template for `Projects` covers both `Projects/note.md` and `Projects/Test/note.md`. Path segments are respected, which keeps `Projects` from matching `Projects-old/note.md`, and an empty folder path means the root of the vault and matches every note, which makes it a general fallback.
* Templates are checked from top to bottom, and the first one matching a note wins: the more specific folders belong above the general ones. A note no template matches is never processed.
* Properties listed in the chosen template come first in the order of the template, and every other property of the note follows them, keeping its original relative order. A note whose frontmatter is already in the required order is not written again.
* The **Create missing properties** setting, off by default. With it on, every property of the chosen template the note doesn't have is created with an empty value, and the required order is applied afterwards. Property types are left to Obsidian: the plugin never assigns or changes one.
* The **Unlisted properties** setting, deciding what happens to the properties a matching template doesn't list: **Keep all** removes nothing, **Remove if empty** removes the ones without a value, and **Remove all** leaves the frontmatter with the properties of the template only. A property counts as empty when it is `null`, an empty string, a string of spaces, an empty list or an empty map, so `false`, `0` and dates are values rather than empty properties. Properties the template lists are never removed, even when they are empty.
* The "Sort properties in all notes" command, processing every Markdown note a template matches and reporting what it did: `Property Organizer: 3 notes updated, 12 unchanged, 40 skipped, 0 errors.` Notes counted as skipped are the ones not processed at all — no template matched them, or they have no frontmatter while **Create missing properties** is off.
* The "Sort properties in current note" command, processing the note of the active Markdown view and saying whether no template matched it, whether its properties were already organized, or that they have been sorted. The command is unavailable when the active view is not a Markdown note.
* A batch run happening once per vault load, after the workspace is ready and the metadata cache has finished its initial build, without blocking the interface. Writes made by the plugin do not start it again, and a notice appears only when notes were updated or errors occurred. Notes are never sorted behind the user's back when they are created, edited, renamed or moved.
* A note with frontmatter Obsidian cannot read is skipped, counted as an error and reported in the developer console, so the rest of the batch carries on.
* Mobile support. The plugin uses the public Obsidian API only — no Node.js, Electron or direct file-system access — processes notes one after another so that a large vault does not flood the device with parallel writes, and reorders the rows of its settings with buttons rather than drag-and-drop, which works with touch as well as with a keyboard.
