import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri erwartet einen festen Dev-Server-Port und kein automatisches Löschen
// der Konsole, da es Rust-Build-Logs parallel anzeigt.
const tauriEnv = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    // host: true bindet an 0.0.0.0, damit der Dev-Server im lokalen Netz (WLAN)
    // auch von anderen Geräten (Handy, Tablet, zweiter Rechner) erreichbar ist.
    host: true,
    port: 5173,
    strictPort: true,
    // Tailscale-MagicDNS-Hostnamen (*.ts.net) zusätzlich zur LAN-IP erlauben,
    // sonst blockt Vites Host-Header-Check den Zugriff über den Tailnet-Namen.
    allowedHosts: [".ts.net"],
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: tauriEnv ? ["es2021", "chrome100", "safari13"] : "modules",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
