import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react()
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
			'@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
			'node:async_hooks': resolve(__dirname, 'src/shims/async_hooks.ts'),
		}
	},
	optimizeDeps: {
		exclude: ['@sqlite.org/sqlite-wasm'],
	},
	build: {
		chunkSizeWarningLimit: 1024000, // Increase chunk size warning limit to 1024000 KB
	},
	server: {
		fs: {
			allow: [
				'../..',
			],
		},
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
		},
	},
})
