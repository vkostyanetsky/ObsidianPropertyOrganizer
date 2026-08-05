import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{ ignores: ["node_modules/**", "main.js", "*.mjs"] },
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
			},
		},
		rules: {
			// The settings tab renders a reorderable list of folder templates,
			// which the declarative API cannot express as a single row, and
			// minAppVersion (1.6.6) predates that API anyway.
			"obsidianmd/settings-tab/prefer-setting-definitions": "off",
		},
	},
]);
