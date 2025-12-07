import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		coverage: {
			reporter: ["text", "json", "html", "lcov"],
			exclude: ["node_modules/", "test/"],
			provider: "istanbul",
		},
		include: [],
		watch: false,
		projects: [
			{
				test: {
					include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
				},
			},
		],
	},
})
