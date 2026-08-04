# Property Organizer

[README in Russian](README.ru.md)

An Obsidian plugin that keeps the properties of your YAML frontmatter in the order you chose. You describe the order per folder, and the plugin rewrites the property order of matching notes — values, names and note content stay exactly as they were.

Sorting runs once when the vault is opened, and on demand through two commands. Notes are never sorted behind your back when they are created, edited, renamed or moved.

## Example

A template for the `Projects` folder:

```text
type, status, created, modified, tags
```

Before:

```yaml
---
tags:
  - work
created: 2026-08-03
summary: Quarterly report
type: project
status: active
---
```

After:

```yaml
---
type: project
status: active
created: 2026-08-03
tags:
  - work
summary: Quarterly report
---
```

`type`, `status` and `created` move to the front in template order. `modified` is not in the note, so it is ignored unless **Create missing properties** is on. `tags` is listed and moves up; `summary` is not listed and keeps its place after the listed ones.

## Folder matching

- A template applies to every Markdown note directly in its folder **and in any subfolder**. A template for `Projects` covers `Projects/note.md` and `Projects/Test/note.md`.
- Matching respects path segments: `Projects` does **not** match `Projects-old/note.md`.
- An empty folder path means the vault root, is equal to `/`, and matches every Markdown note. Use it as a general fallback.
- Folder paths are normalized by Obsidian, so `/Projects/`, `Projects` and `Projects//` are the same folder.
- Notes that no template matches are left alone.

## Template priority

Templates are checked from top to bottom, and **the first matching template wins**. Later templates are not applied to the same note. Put the most specific folders above the general ones:

| # | Folder | Properties |
|---|--------|------------|
| 1 | `Projects/Archive` | `type, archived, created` |
| 2 | `Projects` | `type, status, created` |
| 3 | *(empty)* | `created, tags` |

With that list, `Projects/Archive/note.md` uses the first template only, `Projects/note.md` the second, and everything else the third.

## Property lists

Property names are entered as a comma-separated list, in the order you want them written:

```text
type, status, created, modified, tags
```

- Leading and trailing spaces are removed.
- Empty entries are ignored, so `type,, status,` is fine.
- If a name is repeated, only its first occurrence counts.
- Names are case-sensitive and are never rewritten: `Type` and `type` are two different properties.

## Sorting rules

- Properties listed in the selected template come first, in template order.
- Every other existing property follows, keeping its original relative order.
- Values, property names and their casing are never changed.
- Content after the frontmatter is never touched.
- If the frontmatter is already in the required order, the file is not written again.
- If a note has no frontmatter and **Create missing properties** is off, nothing happens.

Frontmatter is rewritten through Obsidian's own API, so YAML formatting (indentation, quoting, comments) can be normalized by Obsidian. Property values are preserved.

## Create missing properties

A global setting, **off** by default.

- **Off** — only properties that already exist in a note are sorted. Template properties missing from the note are ignored.
- **On** — every property of the matching template is created if the note does not have it, using an empty value:

  ```yaml
  property:
  ```

  The required order is applied afterwards.

Property types are left to Obsidian: the plugin never assigns or changes a property type. If a name already has a vault-level type, Obsidian applies it on its own.

## Commands

| Command | What it does |
|---------|--------------|
| **Sort properties in all notes** | Processes every Markdown note matched by a template. Notes outside the configured folders are not processed. Shows a summary notice: `Property Organizer: 3 notes updated, 12 unchanged, 40 skipped, 0 errors.` |
| **Sort properties in current note** | Processes only the note of the active Markdown view. The command is unavailable when the active view is not a Markdown note. |

In the summary, *skipped* counts notes that were not processed at all: no template matched them, or they have no frontmatter while **Create missing properties** is off.

The current note command reports what happened:

- `Property Organizer: no matching template for the current note.`
- `Property Organizer: properties are already organized.`
- `Property Organizer: properties sorted.`

## Automatic run

The automatic run happens **once per vault load**: after the workspace is ready and after the metadata cache has finished its initial build, without blocking the interface. Writes made by the plugin do not start it again.

Enabling, disabling or hot-reloading the plugin after the vault has finished loading does **not** trigger a batch run — use the commands instead.

After an automatic run, a notice appears only if notes were updated or errors occurred.

## Settings

- **Create missing properties** — described above.
- **Folder templates** — an ordered list. Each row has move up / move down buttons, a folder field with vault folder suggestions, a comma-separated property list and a delete button. **Add template** appends a new row. Changes are saved automatically.

## Installation

The plugin is not published in the community catalog. Install it manually:

1. Build it (see below) or download `main.js`, `manifest.json` and `styles.css` from a release.
2. Copy the three files into `<vault>/.obsidian/plugins/property-organizer/`.
3. Reload Obsidian and enable **Property Organizer** in *Settings → Community plugins*.

## Development

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

`npm run dev` starts a watch build, `npm run build` type-checks and produces the production `main.js`.

Source layout:

| File | Responsibility |
|------|----------------|
| `src/main.ts` | Plugin class, commands, automatic run |
| `src/settings.ts` | Settings types, defaults, loading |
| `src/settingsTab.ts` | Settings interface |
| `src/folderSuggest.ts` | Folder suggestions |
| `src/templateMatching.ts` | Matching templates against note paths |
| `src/propertyOrder.ts` | Pure property-order computation |
| `src/organizer.ts` | Organizing a single note |
| `src/batch.ts` | Batch processing and summaries |
| `src/vaultNoteAccess.ts` | Vault access through the public API |

## Limitations

- Notes are only processed on demand or once per vault load; there is no live sorting on create, edit, rename or move.
- A note with invalid YAML frontmatter is skipped, counted as an error, and reported in the developer console. The rest of the batch continues.
- YAML formatting can be normalized by Obsidian when a note is rewritten; comments inside the frontmatter are not guaranteed to survive.
- Folder paths are compared case-sensitively.
- Property types are never created or changed.

## Mobile

The plugin is not desktop-only and works on mobile. It uses the public Obsidian API only — no Node.js, Electron or direct file-system access — and notes are processed sequentially, one after another, so a large vault does not flood the device with parallel writes. The settings rows are reordered with buttons rather than drag-and-drop, so they work with touch as well as with a keyboard.

## Credits

Scaffolded and reviewed with the help of the [obsidian-plugin-skill](https://github.com/gapmiss/obsidian-plugin-skill) for Claude.
