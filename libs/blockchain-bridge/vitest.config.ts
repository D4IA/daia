import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "#src": path.resolve(__dirname, "./src"),
      "#types": path.resolve(__dirname, "./types"),
      "#tests": path.resolve(__dirname, "./tests"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
