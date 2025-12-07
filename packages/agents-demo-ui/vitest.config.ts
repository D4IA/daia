import { defineConfig } from "vitest/config"
import react from '@vitejs/plugin-react-swc'
import { resolve } from "node:path"

export default defineConfig({
	plugins: [react()],
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
				resolve: {
					alias: {
						"@": resolve(__dirname, "src"),
					},
				},
				test: {
					include: ["src/**/*.spec.ts"],
					browser: {
						enabled: true,
						provider: "playwright",
						isolate: true,
						instances: [
							// { browser: "chromium", headless: true },
							{ browser: "firefox", headless: true },
						],
					},
				},
			},
			{
				resolve: {
					alias: {
						"@": resolve(__dirname, "src"),
					},
				},
				test: {
					setupFiles: [],
					include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
					environment: "jsdom",
				},
			},
		],
	},
})
