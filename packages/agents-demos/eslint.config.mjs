import js from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier"

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts"],
		ignores: ["dist"],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"no-console": "off",
			"@typescript-eslint/no-unused-vars": ["error", {
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_"
			}],
		},
	},
	prettier,
)
