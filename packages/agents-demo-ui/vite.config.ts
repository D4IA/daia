import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from "node:path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
				maximumFileSizeToCacheInBytes: 3000000, // 3MB limit for SQLite WASM
			},
			includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'mask-icon.svg'],
			manifest: {
				name: 'Mintay App',
				short_name: 'Mintay',
				description: 'A modern web application built with React and Vite',
				theme_color: '#2563eb',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'pwa-192x192.svg',
						sizes: '192x192',
						type: 'image/svg+xml'
					},
					{
						src: 'pwa-512x512.svg',
						sizes: '512x512',
						type: 'image/svg+xml'
					},
					{
						src: 'pwa-512x512.svg',
						sizes: '512x512',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
				]
			}
		})
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
			'@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
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
