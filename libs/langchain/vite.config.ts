import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*"],
      outDir: "dist",
      rollupTypes: true,
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
        "@langchain/core/messages",
        "@langchain/core/runnables",
        "@langchain/core/language_models/chat_models",
        "@d4ia/proto",
        "@bsv/sdk",
        "zod",
      ],
    },
  },
});
