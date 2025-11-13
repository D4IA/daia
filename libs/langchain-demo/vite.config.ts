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
      entry: path.resolve(__dirname, "src/main.ts"),
      name: "LangchainDemo",
      fileName: (format) => `langchain-demo.${format}.js`,
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@langchain/core",
        "@langchain/core/messages",
        "@langchain/core/prompts",
        "@langchain/core/runnables",
        "@langchain/core/language_models/chat_models",
        "@langchain/openai",
        "@d4ia/proto",
        "@d4ia/langchain",
        "dotenv",
        "zod",
      ],
    },
  },
});
