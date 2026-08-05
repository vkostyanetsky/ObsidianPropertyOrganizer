# Contributing

Thanks for your interest in Property Organizer. Bug reports, questions and pull
requests are all welcome.

## Reporting a bug

Open an issue and include:

- the plugin version and your Obsidian version;
- the platform (desktop or mobile, and the operating system);
- the folder templates and settings involved;
- the frontmatter you started with and what you expected instead.

If a note failed to process, the plugin logs the reason to the developer console
(`Ctrl+Shift+I` on Windows and Linux, `Cmd+Option+I` on macOS). Please include
that message.

## Suggesting a change

Open an issue before writing code for anything larger than a fix. It is easier
to agree on the behaviour first than to rework a finished pull request.

## Development setup

```bash
npm install
```

The plugin is written in TypeScript and bundled with esbuild.

| Command         | What it does                                        |
| --------------- | --------------------------------------------------- |
| `npm run dev`   | Builds `main.js` and rebuilds on every source edit. |
| `npm run build` | Type-checks and produces a production `main.js`.    |
| `npm run lint`  | Runs ESLint, including the Obsidian rule set.       |
| `npm test`      | Runs the test suite with Vitest.                    |

To try your build inside Obsidian, work in a test vault and symlink (or copy)
the repository into `<vault>/.obsidian/plugins/property-organizer/`, so that
`main.js`, `manifest.json` and `styles.css` sit next to each other. Reload the
plugin from the community plugins list after each build.

**Please use a test vault, not one with notes you care about.** The plugin
rewrites frontmatter, and some settings remove properties.

## Code guidelines

The project follows the
[Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
and the rules of `eslint-plugin-obsidianmd`. In particular:

- Keep the sorting logic free of Obsidian imports. `propertyOrder.ts`,
  `organizer.ts`, `batch.ts`, `settings.ts` and `templateMatching.ts` are pure
  and unit-tested; Obsidian's API is reached through `vaultNoteAccess.ts`.
- Style with the Obsidian CSS variables in `styles.css`, scoped to the
  `property-organizer-` classes. No inline styles, no `!important`.
- Use sentence case in user-facing text, and no plugin-name prefix in notices.
- Keep interactive elements keyboard accessible, with an `aria-label` where the
  control has no visible text.

## Pull requests

- Cover behaviour changes with tests. Logic that does not need a running
  Obsidian instance should be tested without one.
- Run `npm run lint`, `npm test` and `npm run build` before pushing. CI runs the
  first two on every pull request.
- Keep the commit history readable, and describe the user-visible effect of the
  change in the pull request body.
- Add an entry to `CHANGELOG.md` under an `Unreleased` heading. Version numbers
  and release tags are handled by the maintainer.

## License

Contributions are accepted under the [MIT License](LICENSE) that covers this
project.
