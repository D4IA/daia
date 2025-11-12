import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "D4iaProto",
      fileName: (format) => `proto.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: [],
    },
  },
});
