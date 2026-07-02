import { defineConfig } from "vitest/config";
import path from "node:path";

// Eigene, schlanke Vitest-Konfiguration (statt die Vite-Config zu importieren,
// die Tauri-/Dev-Server-Sonderfälle enthält). Getestet wird reine Logik ohne
// DOM, daher Node-Environment.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
