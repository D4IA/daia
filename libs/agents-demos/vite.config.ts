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
      name: "D4iaAgentsDemos",
      fileName: (format) => `agents-demos.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "@d4ia/blockchain-bridge",
        "@d4ia/core",
        "@d4ia/langchain",
        "@langchain/core",
        "@langchain/langgraph",
        "@langchain/openai",
        "express",
        "immer",
        "zod",
        "@bsv/sdk"
      ],
    },
  },
});
