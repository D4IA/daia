import { defineConfig } from "vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts({
      outDir: "dist",
      include: ["src"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/tests/**", "**/__tests__/**"],
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "D4iaLangchain",
      fileName: (format) => `langchain.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "@langchain/core",
        "@langchain/langgraph",
        "@d4ia/core",
        "immer",
        "zod"
      ],
    },
  },
});
