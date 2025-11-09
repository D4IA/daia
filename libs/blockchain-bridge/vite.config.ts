import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "src"),
      "@types": path.resolve(__dirname, "types"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "D4iaBlockchainBridge",
      fileName: (format) => `blockchain-bridge.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: [], // np. ['react'] jeśli chcesz wykluczyć z bundla
    },
  },
});
