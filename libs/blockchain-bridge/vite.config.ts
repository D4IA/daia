import { defineConfig } from "vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      outDir: "dist",
      include: ["src", "types"],
      exclude: ["**/*.test.ts", "**/tests/**"],
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "D4iaBlockchainBridge",
      fileName: (format) => `blockchain-bridge.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: [],
    },
  },
});
