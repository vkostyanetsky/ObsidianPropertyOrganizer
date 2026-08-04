/**
 * Minimal stand-in for the parts of the Obsidian API used by the pure modules
 * under test. Mapped onto the `obsidian` module id by `vitest.config.mjs`.
 *
 * Mirrors how Obsidian collapses separators and returns the vault root for an
 * empty path.
 */
export function normalizePath(path: string): string {
	return (
		path
			.replace(/([\\/])+/g, "/")
			.replace(/(^\/+|\/+$)/g, "") || "/"
	);
}
